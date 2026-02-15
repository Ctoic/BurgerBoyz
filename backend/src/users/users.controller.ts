import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard)
@Controller("admin/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.usersService.listCustomers(query);
  }

  @Post()
  createCustomer(@Body() body: CreateCustomerDto) {
    return this.usersService.createCustomer(body);
  }

  @Delete(":id")
  deleteCustomer(@Param("id") id: string) {
    return this.usersService.deleteCustomer(id);
  }
}
