import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EmailOtpPurpose, User } from "@prisma/client";
import { createHash, randomInt } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

const OTP_DEFAULT_LENGTH = 6;
const OTP_DEFAULT_EXPIRY_SECONDS = 60;
const OTP_DEFAULT_RESEND_COOLDOWN_SECONDS = 30;
const OTP_DEFAULT_MAX_ATTEMPTS = 5;

@Injectable()
export class CustomerAuthService {
  private readonly otpLength = Number(process.env.OTP_CODE_LENGTH ?? OTP_DEFAULT_LENGTH);
  private readonly otpExpirySeconds = Number(
    process.env.OTP_EXPIRY_SECONDS ?? OTP_DEFAULT_EXPIRY_SECONDS,
  );
  private readonly otpResendCooldownSeconds = Number(
    process.env.OTP_RESEND_COOLDOWN_SECONDS ?? OTP_DEFAULT_RESEND_COOLDOWN_SECONDS,
  );
  private readonly otpMaxAttempts = Number(
    process.env.OTP_MAX_ATTEMPTS ?? OTP_DEFAULT_MAX_ATTEMPTS,
  );
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly resendFromEmail = process.env.RESEND_FROM_EMAIL;
  private readonly otpHashSecret = process.env.OTP_HASH_SECRET ?? process.env.JWT_SECRET ?? "otp-secret";

  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async signup(input: {
    email: string;
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressInstructions?: string;
  }) {
    const email = this.normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.role === "ADMIN") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        name: input.name ?? undefined,
        phone: input.phone ?? undefined,
        addressLine1: input.addressLine1 ?? undefined,
        addressLine2: input.addressLine2 ?? undefined,
        addressCity: input.addressCity ?? undefined,
        addressPostcode: input.addressPostcode ?? undefined,
        addressInstructions: input.addressInstructions ?? undefined,
      },
      create: {
        email,
        role: "CUSTOMER",
        name: input.name ?? undefined,
        phone: input.phone ?? undefined,
        addressLine1: input.addressLine1 ?? undefined,
        addressLine2: input.addressLine2 ?? undefined,
        addressCity: input.addressCity ?? undefined,
        addressPostcode: input.addressPostcode ?? undefined,
        addressInstructions: input.addressInstructions ?? undefined,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: this.mapCustomerUser(user),
    };
  }

  async requestSignupOtp(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.role === "ADMIN") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const now = new Date();
    const latestActiveOtp = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: EmailOtpPurpose.CUSTOMER_SIGNUP,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestActiveOtp && latestActiveOtp.resendAvailableAt > now) {
      const waitSeconds = Math.ceil(
        (latestActiveOtp.resendAvailableAt.getTime() - now.getTime()) / 1000,
      );
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting a new code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.prisma.emailOtp.updateMany({
      where: {
        email,
        purpose: EmailOtpPurpose.CUSTOMER_SIGNUP,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    const otpCode = this.generateOtpCode(this.otpLength);
    const otpHash = this.hashOtp(email, otpCode, EmailOtpPurpose.CUSTOMER_SIGNUP);

    const createdOtp = await this.prisma.emailOtp.create({
      data: {
        email,
        userId: existing?.role === "CUSTOMER" ? existing.id : undefined,
        purpose: EmailOtpPurpose.CUSTOMER_SIGNUP,
        codeHash: otpHash,
        expiresAt: new Date(now.getTime() + this.otpExpirySeconds * 1000),
        resendAvailableAt: new Date(now.getTime() + this.otpResendCooldownSeconds * 1000),
        attempts: 0,
        maxAttempts: this.otpMaxAttempts,
      },
    });

    try {
      await this.sendOtpEmail(email, otpCode);
    } catch (error) {
      await this.prisma.emailOtp.update({
        where: { id: createdOtp.id },
        data: { usedAt: now },
      });
      throw error;
    }

    return {
      ok: true,
      expiresInSeconds: this.otpExpirySeconds,
      resendAfterSeconds: this.otpResendCooldownSeconds,
    };
  }

  async verifySignupOtp(input: {
    email: string;
    code: string;
    name?: string;
    phone?: string;
  }) {
    const email = this.normalizeEmail(input.email);
    const code = input.code.trim();

    if (!/^\d+$/.test(code) || code.length !== this.otpLength) {
      throw new BadRequestException("Enter a valid verification code.");
    }

    const now = new Date();
    const otpRecord = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: EmailOtpPurpose.CUSTOMER_SIGNUP,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new UnauthorizedException("Invalid verification code.");
    }

    if (otpRecord.expiresAt <= now) {
      await this.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: now },
      });
      throw new UnauthorizedException("Code expired. Request a new code.");
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await this.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: now },
      });
      throw new UnauthorizedException("Maximum attempts reached. Request a new code.");
    }

    const expectedHash = this.hashOtp(email, code, EmailOtpPurpose.CUSTOMER_SIGNUP);
    if (expectedHash !== otpRecord.codeHash) {
      const nextAttempts = otpRecord.attempts + 1;
      const exhausted = nextAttempts >= otpRecord.maxAttempts;
      await this.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: nextAttempts,
          usedAt: exhausted ? now : undefined,
        },
      });

      if (exhausted) {
        throw new UnauthorizedException("Maximum attempts reached. Request a new code.");
      }
      const remaining = otpRecord.maxAttempts - nextAttempts;
      throw new UnauthorizedException(
        `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailOtp.update({
        where: { id: otpRecord.id },
        data: {
          usedAt: now,
          attempts: otpRecord.attempts + 1,
        },
      });

      const existing = await tx.user.findUnique({ where: { email } });
      if (existing && existing.role === "ADMIN") {
        throw new UnauthorizedException("Invalid credentials");
      }

      return tx.user.upsert({
        where: { email },
        update: {
          name: input.name?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
        },
        create: {
          email,
          role: "CUSTOMER",
          name: input.name?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
        },
      });
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: this.mapCustomerUser(user),
    };
  }

  async login(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "CUSTOMER") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: this.mapCustomerUser(user),
    };
  }

  async updateProfile(
    userId: string,
    data: Partial<{
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2: string;
      addressCity: string;
      addressPostcode: string;
      addressInstructions: string;
    }>,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? undefined,
        phone: data.phone ?? undefined,
        addressLine1: data.addressLine1 ?? undefined,
        addressLine2: data.addressLine2 ?? undefined,
        addressCity: data.addressCity ?? undefined,
        addressPostcode: data.addressPostcode ?? undefined,
        addressInstructions: data.addressInstructions ?? undefined,
      },
    });

    return this.mapCustomerUser(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return this.mapCustomerUser(user);
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private generateOtpCode(length: number) {
    return Array.from({ length }, () => String(randomInt(0, 10))).join("");
  }

  private hashOtp(email: string, code: string, purpose: EmailOtpPurpose) {
    return createHash("sha256")
      .update(`${purpose}|${email}|${code}|${this.otpHashSecret}`)
      .digest("hex");
  }

  private async sendOtpEmail(email: string, code: string) {
    const resendApiKey = this.resendApiKey?.trim();
    const resendFromEmail =
      this.resendFromEmail?.trim() ||
      process.env.ADMIN_EMAIL?.trim() ||
      "onboarding@resend.dev";

    if (!resendApiKey) {
      throw new ServiceUnavailableException(
        "OTP email service is not configured. Missing RESEND_API_KEY.",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [email],
        subject: "Your BurgerBoyz verification code",
        text: `Your BurgerBoyz verification code is ${code}. It expires in ${this.otpExpirySeconds} seconds.`,
        html: `<p>Your BurgerBoyz verification code is <strong>${code}</strong>.</p><p>This code expires in ${this.otpExpirySeconds} seconds.</p>`,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new ServiceUnavailableException(
        responseText
          ? `Unable to send verification code right now. ${responseText}`
          : "Unable to send verification code right now.",
      );
    }
  }

  private mapCustomerUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      addressCity: user.addressCity,
      addressPostcode: user.addressPostcode,
      addressInstructions: user.addressInstructions,
    };
  }
}
