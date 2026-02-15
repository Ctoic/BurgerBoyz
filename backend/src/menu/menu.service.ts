import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddOnDto } from "./dto/create-add-on.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateDealDto } from "./dto/create-deal.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { ListPublicDealsQueryDto } from "./dto/list-public-deals-query.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";

export interface ResolvedDealItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  quantity: number;
  imageUrl: string | null;
  isPopular: boolean;
  categoryName: string;
}

export interface ResolvedDeal {
  id: string;
  name: string;
  description: string;
  tag: string;
  imageUrl: string | null;
  discountCents: number;
  subtotalCents: number;
  finalPriceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bundleItems: ResolvedDealItem[];
}

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  private readonly dealInclude = {
    bundleItems: {
      orderBy: { position: "asc" as const },
      include: {
        menuItem: {
          include: {
            category: {
              select: { name: true },
            },
          },
        },
      },
    },
  };

  async getPublicMenu() {
    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            addOns: {
              include: { addOn: true },
            },
          },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        addOns: item.addOns.map((link) => link.addOn),
      })),
    }));
  }

  async getAdminMenu() {
    const categories = await this.prisma.menuCategory.findMany({
      orderBy: { position: "asc" },
      include: {
        items: {
          orderBy: { name: "asc" },
          include: {
            addOns: {
              include: { addOn: true },
            },
          },
        },
      },
    });

    const addOns = await this.prisma.addOn.findMany({ orderBy: { name: "asc" } });

    const deals = await this.getAdminDeals();

    return {
      categories: categories.map((category) => ({
        ...category,
        items: category.items.map((item) => ({
          ...item,
          addOns: item.addOns.map((link) => link.addOn),
        })),
      })),
      addOns,
      deals,
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.menuCategory.create({
      data: {
        name: dto.name,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async createAddOn(dto: CreateAddOnDto) {
    return this.prisma.addOn.create({
      data: {
        name: dto.name,
        priceCents: dto.priceCents,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        imageUrl: dto.imageUrl,
        isPopular: dto.isPopular ?? false,
        isActive: dto.isActive ?? true,
        addOns: dto.addOnIds?.length
          ? {
              create: dto.addOnIds.map((addOnId) => ({ addOnId })),
            }
          : undefined,
      },
    });
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        imageUrl: dto.imageUrl,
        isPopular: dto.isPopular,
        isActive: dto.isActive,
      },
    });

    if (dto.addOnIds) {
      await this.prisma.menuItemAddOn.deleteMany({ where: { menuItemId: id } });
      if (dto.addOnIds.length) {
        await this.prisma.menuItemAddOn.createMany({
          data: dto.addOnIds.map((addOnId) => ({
            menuItemId: id,
            addOnId,
          })),
        });
      }
    }

    return item;
  }

  async deleteMenuItem(id: string) {
    await this.prisma.menuItemAddOn.deleteMany({ where: { menuItemId: id } });
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async createDeal(dto: CreateDealDto): Promise<ResolvedDeal> {
    const quantityByMenuItemId = new Map<string, number>();
    for (const bundleItem of dto.bundleItems) {
      const menuItemId = bundleItem.menuItemId.trim();
      if (!menuItemId) {
        continue;
      }
      quantityByMenuItemId.set(
        menuItemId,
        (quantityByMenuItemId.get(menuItemId) ?? 0) + bundleItem.quantity,
      );
    }

    const normalizedBundleItems = [...quantityByMenuItemId.entries()].map(
      ([menuItemId, quantity]) => ({ menuItemId, quantity }),
    );
    if (normalizedBundleItems.length === 0) {
      throw new BadRequestException("At least one bundle item is required.");
    }

    const normalizedItemIds = normalizedBundleItems.map((item) => item.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: normalizedItemIds }, isActive: true },
      select: { id: true },
    });
    if (menuItems.length !== normalizedItemIds.length) {
      throw new BadRequestException("One or more bundle items are invalid.");
    }

    const createdDeal = await this.prisma.deal.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        tag: dto.tag?.trim() || "Deal",
        imageUrl: dto.imageUrl?.trim() || null,
        discountCents: dto.discountCents ?? 0,
        isActive: dto.isActive ?? true,
        bundleItems: {
          create: normalizedBundleItems.map((item, index) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            position: index,
          })),
        },
      },
      include: this.dealInclude,
    });

    return this.resolveDeal(createdDeal);
  }

  async deleteDeal(id: string) {
    const deleted = await this.prisma.deal.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException("Deal not found.");
    }
    return { ok: true };
  }

  async getPublicDeals(query: ListPublicDealsQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);

    const [activeDeals, totalItems] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where: { isActive: true },
        include: this.dealInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deal.count({
        where: { isActive: true },
      }),
    ]);

    const items = activeDeals
      .map((deal) => this.resolveDeal(deal))
      .filter((deal) => deal.bundleItems.length > 0);

    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async getAdminDeals(): Promise<ResolvedDeal[]> {
    const deals = await this.prisma.deal.findMany({
      include: this.dealInclude,
      orderBy: { createdAt: "desc" },
    });
    return deals.map((deal) => this.resolveDeal(deal));
  }

  private resolveDeal(deal: {
    id: string;
    name: string;
    description: string;
    tag: string;
    imageUrl: string | null;
    discountCents: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    bundleItems: {
      quantity: number;
      menuItem: {
        id: string;
        name: string;
        description: string;
        priceCents: number;
        imageUrl: string | null;
        isPopular: boolean;
        category: {
          name: string;
        };
      };
    }[];
  }): ResolvedDeal {
    const bundleItems: ResolvedDealItem[] = deal.bundleItems.map((bundleItem) => ({
      id: bundleItem.menuItem.id,
      name: bundleItem.menuItem.name,
      description: bundleItem.menuItem.description,
      priceCents: bundleItem.menuItem.priceCents,
      quantity: bundleItem.quantity,
      imageUrl: bundleItem.menuItem.imageUrl ?? null,
      isPopular: bundleItem.menuItem.isPopular,
      categoryName: bundleItem.menuItem.category.name,
    }));

    const subtotalCents = bundleItems.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
    const finalPriceCents = Math.max(0, subtotalCents - deal.discountCents);

    return {
      id: deal.id,
      name: deal.name,
      description: deal.description,
      tag: deal.tag,
      imageUrl: deal.imageUrl,
      discountCents: deal.discountCents,
      subtotalCents,
      finalPriceCents,
      isActive: deal.isActive,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
      bundleItems,
    };
  }
}
