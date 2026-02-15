import { Body, Controller, Get, Post, Res, UseGuards, Req } from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("admin")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.login(body.email, body.password);

    const isSecure = process.env.COOKIE_SECURE === "true";
    const domain = process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN !== "localhost"
      ? process.env.COOKIE_DOMAIN
      : undefined;

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      domain,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return { user };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("admin_token");
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return { user: req.user };
  }
}
