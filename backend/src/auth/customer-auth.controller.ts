import { Body, Controller, Get, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { CustomerAuthService } from "./customer-auth.service";
import { buildAuthCookieOptions } from "./cookie-options";
import { CustomerJwtAuthGuard } from "./guards/customer-jwt.guard";
import { OptionalCustomerJwtGuard } from "./guards/optional-customer.guard";
import { CustomerProfileDto } from "./dto/customer-profile.dto";
import { OrdersService } from "../orders/orders.service";
import { CustomerLoginDto } from "./dto/customer-login.dto";
import { CustomerSignupDto } from "./dto/customer-signup.dto";
import { ListUserOrdersQueryDto } from "../orders/dto/list-user-orders-query.dto";

@Controller("auth")
export class CustomerAuthController {
  constructor(
    private readonly customerAuthService: CustomerAuthService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post("signup")
  async signup(@Body() body: CustomerSignupDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.customerAuthService.signup(body);
    this.setAuthCookie(res, token);
    return { user };
  }

  @Post("login")
  async login(@Body() body: CustomerLoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.customerAuthService.login(body.email);
    this.setAuthCookie(res, token);
    return { user };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("customer_token");
    return { ok: true };
  }

  @Get("me")
  @UseGuards(OptionalCustomerJwtGuard)
  async me(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    if (!user) return { user: null };
    const profile = await this.customerAuthService.getProfile(user.id);
    return { user: profile };
  }

  @Put("profile")
  @UseGuards(CustomerJwtAuthGuard)
  async updateProfile(@Req() req: Request, @Body() body: CustomerProfileDto) {
    const user = req.user as { id: string } | undefined;
    if (!user) return { user: null };
    const updated = await this.customerAuthService.updateProfile(user.id, body);
    return { user: updated };
  }

  @Get("orders")
  @UseGuards(CustomerJwtAuthGuard)
  async listOrders(@Req() req: Request, @Query() query: ListUserOrdersQueryDto) {
    const user = req.user as { id: string } | undefined;
    if (!user) return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 };
    return this.ordersService.listOrdersForUser(user.id, query);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(
      "customer_token",
      token,
      buildAuthCookieOptions(1000 * 60 * 60 * 24 * 30),
    );
  }
}
