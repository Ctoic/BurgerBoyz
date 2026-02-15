import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { DeliveryZonesService } from "../delivery-zones/delivery-zones.service";
import {
  CreateOrderDto,
  FulfillmentType,
  OrderType,
  PaymentMethod,
} from "./dto/create-order.dto";
import { ListAdminOrdersQueryDto } from "./dto/list-admin-orders-query.dto";
import { ListUserOrdersQueryDto } from "./dto/list-user-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

const ORDER_TYPE_NOTE_PREFIX = "ORDER_TYPE:";
const PAST_ORDER_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];
const ADDRESS_SELECT = {
  id: true,
  line1: true,
  line2: true,
  city: true,
  postcode: true,
  instructions: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private deliveryZonesService: DeliveryZonesService,
  ) {}

  private extractOrderType(notes?: string | null): OrderType {
    if (!notes?.startsWith(ORDER_TYPE_NOTE_PREFIX)) {
      return OrderType.NORMAL;
    }

    const rawType = notes.slice(ORDER_TYPE_NOTE_PREFIX.length);
    return rawType === OrderType.DEAL ? OrderType.DEAL : OrderType.NORMAL;
  }

  private mapOrderResponse<
    T extends {
      notes?: string | null;
    },
  >(order: T): T & { orderType: OrderType } {
    return {
      ...order,
      orderType: this.extractOrderType(order.notes),
    };
  }

  async createOrder(dto: CreateOrderDto, userId: string | null) {
    if (dto.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException("Cash only at the moment.");
    }

    if (dto.fulfillmentType === FulfillmentType.DELIVERY && !dto.address && !userId) {
      throw new BadRequestException("Delivery address is required.");
    }

    const menuItemIds = [...new Set(dto.items.map((item) => item.menuItemId))];
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });
    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException("One or more menu items are invalid.");
    }

    const addOnIds = [...new Set(dto.items.flatMap((item) => item.addOnIds ?? []))];
    const addOns = addOnIds.length
      ? await this.prisma.addOn.findMany({ where: { id: { in: addOnIds } } })
      : [];
    if (addOnIds.length && addOns.length !== addOnIds.length) {
      throw new BadRequestException("One or more add-ons are invalid.");
    }

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
    const addOnMap = new Map(addOns.map((addOn) => [addOn.id, addOn]));

    const storeSettings = await this.prisma.storeSettings.findFirst();
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;
    const deliveryFeeCents =
      dto.fulfillmentType === FulfillmentType.DELIVERY
        ? storeSettings?.deliveryFeeCents ?? 0
        : 0;

    const orderItemsData = dto.items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        throw new BadRequestException("Menu item not found.");
      }
      const addOnEntities = (item.addOnIds ?? []).map((addOnId) => {
        const addOn = addOnMap.get(addOnId);
        if (!addOn) {
          throw new BadRequestException("Add-on not found.");
        }
        return addOn;
      });

      const addOnsTotal = addOnEntities.reduce((sum, addOn) => sum + addOn.priceCents, 0);
      const basePriceCents = menuItem.priceCents;
      const lineTotal = (basePriceCents + addOnsTotal) * item.quantity;

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        basePriceCents,
        quantity: item.quantity,
        removals: item.removals ?? [],
        addOns: {
          create: addOnEntities.map((addOn) => ({
            name: addOn.name,
            priceCents: addOn.priceCents,
          })),
        },
        lineTotal,
      };
    });

    const subtotalCents = orderItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCents = subtotalCents + deliveryFeeCents;
    const orderType = dto.orderType ?? OrderType.NORMAL;

    const fallbackAddress =
      dto.fulfillmentType === FulfillmentType.DELIVERY && !dto.address && user
        ? {
            line1: user.addressLine1 ?? "",
            line2: user.addressLine2 ?? undefined,
            city: user.addressCity ?? "",
            postcode: user.addressPostcode ?? "",
            instructions: user.addressInstructions ?? undefined,
            latitude: undefined,
            longitude: undefined,
          }
        : null;

    const resolvedAddress = dto.address ?? fallbackAddress;

    if (dto.fulfillmentType === FulfillmentType.DELIVERY && resolvedAddress) {
      if (!resolvedAddress.line1 || !resolvedAddress.city || !resolvedAddress.postcode) {
        throw new BadRequestException("Delivery address is required.");
      }

      const deliveryCheck = await this.deliveryZonesService.checkAddress({
        city: resolvedAddress.city,
        postcode: resolvedAddress.postcode,
        latitude: resolvedAddress.latitude,
        longitude: resolvedAddress.longitude,
      });

      if (!deliveryCheck.deliverable) {
        throw new BadRequestException(
          "This address is outside our delivery zone. Please use pickup or a supported address.",
        );
      }
    }

    const address = resolvedAddress
      ? await (async () => {
          const baseAddressData = {
            line1: resolvedAddress.line1,
            line2: resolvedAddress.line2,
            city: resolvedAddress.city,
            postcode: resolvedAddress.postcode,
            instructions: resolvedAddress.instructions,
          };
          const addressData: typeof baseAddressData & {
            latitude?: number;
            longitude?: number;
          } = { ...baseAddressData };

          if (resolvedAddress.latitude !== undefined) {
            addressData.latitude = resolvedAddress.latitude;
          }
          if (resolvedAddress.longitude !== undefined) {
            addressData.longitude = resolvedAddress.longitude;
          }

          try {
            return await this.prisma.address.create({ data: addressData });
          } catch (error) {
            const isMissingGeoColumn =
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code?: string }).code === "P2022";

            if (!isMissingGeoColumn) {
              throw error;
            }

            return this.prisma.address.create({ data: baseAddressData });
          }
        })()
      : null;

    const order = await this.prisma.order.create({
      data: {
        userId: userId ?? undefined,
        paymentMethod: dto.paymentMethod,
        fulfillmentType: dto.fulfillmentType,
        notes: `${ORDER_TYPE_NOTE_PREFIX}${orderType}`,
        customerName: dto.customerName ?? user?.name ?? undefined,
        customerEmail: dto.customerEmail ?? user?.email ?? undefined,
        customerPhone: dto.customerPhone ?? user?.phone ?? undefined,
        addressId: address?.id,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        items: {
          create: orderItemsData.map(({ lineTotal, ...data }) => data),
        },
      },
      include: {
        items: { include: { addOns: true } },
        address: { select: ADDRESS_SELECT },
        user: { select: { id: true, email: true } },
      },
    });

    return this.mapOrderResponse(order);
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { addOns: true } },
        address: { select: ADDRESS_SELECT },
        user: { select: { id: true, email: true } },
      },
    });
    if (!order) {
      throw new NotFoundException("Order not found.");
    }
    return this.mapOrderResponse(order);
  }

  async listOrders(query: ListAdminOrdersQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    const range = query.range ?? "all";
    if (range !== "all" && range !== "custom") {
      const now = new Date();
      const cutoff = new Date(now);
      if (range === "today") {
        cutoff.setHours(0, 0, 0, 0);
      } else if (range === "week") {
        cutoff.setDate(now.getDate() - 7);
      } else if (range === "month") {
        cutoff.setDate(now.getDate() - 30);
      } else if (range === "year") {
        cutoff.setDate(now.getDate() - 365);
      }
      where.createdAt = { gte: cutoff };
    }

    const search = query.search?.trim();
    if (search) {
      where.AND = [
        {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { customerEmail: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search, mode: "insensitive" } },
            { address: { is: { line1: { contains: search, mode: "insensitive" } } } },
            { address: { is: { city: { contains: search, mode: "insensitive" } } } },
            { address: { is: { postcode: { contains: search, mode: "insensitive" } } } },
            { items: { some: { name: { contains: search, mode: "insensitive" } } } },
          ],
        },
      ];
    }

    const [orders, totalItems] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { include: { addOns: true } },
          address: { select: ADDRESS_SELECT },
          user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = orders.map((order) => this.mapOrderResponse(order));
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async listOrdersForUser(userId: string, query: ListUserOrdersQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);

    const where: Prisma.OrderWhereInput = { userId };

    if (query.view === "active") {
      where.status = { notIn: PAST_ORDER_STATUSES };
    } else if (query.view === "past") {
      where.status = { in: PAST_ORDER_STATUSES };
    }

    if (query.date) {
      const dayStart = new Date(`${query.date}T00:00:00.000Z`);
      const nextDay = new Date(dayStart);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      where.createdAt = { gte: dayStart, lt: nextDay };
    }

    const search = query.search?.trim();
    if (search) {
      where.AND = [
        {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { items: { some: { name: { contains: search, mode: "insensitive" } } } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [orders, totalItems] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { include: { addOns: true } },
          address: { select: ADDRESS_SELECT },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = orders.map((order) => this.mapOrderResponse(order));
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
    return this.mapOrderResponse(updatedOrder);
  }
}
