import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomerAuthService {
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
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing && existing.role === "ADMIN") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.upsert({
      where: { email: input.email },
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
        email: input.email,
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
      user: {
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
      },
    };
  }

  async login(email: string) {
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
      user: {
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
      },
    };
  }

  async updateProfile(userId: string, data: Partial<{
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPostcode: string;
    addressInstructions: string;
  }>) {
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

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
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
