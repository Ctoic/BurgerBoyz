import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalCustomerJwtGuard } from "../auth/guards/optional-customer.guard";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";
import { Request } from "express";

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(OptionalCustomerJwtGuard)
  @Post("orders")
  createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    return this.ordersService.createOrder(dto, user?.id ?? null);
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.ordersService.getOrderById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/orders")
  listOrders(@Query() query: ListAdminOrdersQueryDto) {
    return this.ordersService.listOrders(query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("admin/orders/:id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
