import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listCustomers(query: ListCustomersQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressPostcode: true,
          addressInstructions: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async createCustomer(input: CreateCustomerDto) {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Email is required.");
    }

    const name = input.name?.trim() || null;
    const phone = input.phone?.trim() || null;

    try {
      return await this.prisma.user.create({
        data: {
          email,
          role: "CUSTOMER",
          name,
          phone,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          name: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressPostcode: true,
          addressInstructions: true,
          _count: { select: { orders: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A user with this email already exists.");
      }
      throw error;
    }
  }

  async deleteCustomer(id: string) {
    const customer = await this.prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }

    await this.prisma.$transaction([
      this.prisma.order.updateMany({
        where: { userId: customer.id },
        data: { userId: null },
      }),
      this.prisma.user.delete({
        where: { id: customer.id },
      }),
    ]);

    return { ok: true };
  }
}
