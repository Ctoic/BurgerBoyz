import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAddOnDto } from "./dto/create-add-on.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateDealDto } from "./dto/create-deal.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { ListPublicDealsQueryDto } from "./dto/list-public-deals-query.dto";
import { UpdateAddOnDto } from "./dto/update-add-on.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
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

interface UploadedMenuImageFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private static readonly MAX_MENU_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_MENU_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);

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

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }
  }

  private async normalizeDealBundleItems(
    bundleItems: { menuItemId: string; quantity: number }[],
  ) {
    const quantityByMenuItemId = new Map<string, number>();
    for (const bundleItem of bundleItems) {
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

    return normalizedBundleItems;
  }

  async getPublicMenu() {
    const [categories, globalAddOns] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: {
          addOns: {
            where: { isActive: true },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { name: "asc" },
          },
          items: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            include: {
              addOns: {
                include: {
                  addOn: {
                    include: {
                      category: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.addOn.findMany({
        where: { isActive: true, categoryId: null },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return categories.map((category) => {
      const { addOns: categoryAddOns, ...categoryBase } = category;

      return {
        ...categoryBase,
        items: category.items.map((item) => {
          const linkedAddOns = item.addOns
            .map((link) => link.addOn)
            .filter(
              (addOn) => addOn.isActive && (!addOn.categoryId || addOn.categoryId === item.categoryId),
            );

          const candidateAddOns = linkedAddOns.length
            ? linkedAddOns
            : [...categoryAddOns, ...globalAddOns];

          const dedupedAddOns = Array.from(
            new Map(candidateAddOns.map((addOn) => [addOn.id, addOn])).values(),
          );

          return {
            ...item,
            addOns: dedupedAddOns,
          };
        }),
      };
    });
  }

  async getAdminMenu() {
    const categories = await this.prisma.menuCategory.findMany({
      orderBy: { position: "asc" },
      include: {
        items: {
          orderBy: { name: "asc" },
          include: {
            addOns: {
              include: {
                addOn: {
                  include: {
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const addOns = await this.prisma.addOn.findMany({
      orderBy: { name: "asc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

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

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        name: dto.name,
        position: dto.position,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            items: true,
            addOns: true,
          },
        },
      },
    });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }

    if (category._count.items > 0 || category._count.addOns > 0) {
      throw new BadRequestException(
        "Cannot delete category with linked items or add-ons. Update or delete them first.",
      );
    }

    await this.prisma.menuCategory.delete({ where: { id } });
    return { ok: true };
  }

  async createAddOn(dto: CreateAddOnDto) {
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    return this.prisma.addOn.create({
      data: {
        categoryId: dto.categoryId ?? null,
        name: dto.name,
        priceCents: dto.priceCents,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAddOn(id: string, dto: UpdateAddOnDto) {
    const addOn = await this.prisma.addOn.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!addOn) {
      throw new NotFoundException("Add-on not found.");
    }

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    return this.prisma.addOn.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        priceCents: dto.priceCents,
        isActive: dto.isActive,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteAddOn(id: string) {
    const deleted = await this.prisma.addOn.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException("Add-on not found.");
    }
    return { ok: true };
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    if (dto.addOnIds?.length) {
      const addOns = await this.prisma.addOn.findMany({
        where: { id: { in: dto.addOnIds } },
        select: { id: true, categoryId: true },
      });
      if (addOns.length !== dto.addOnIds.length) {
        throw new BadRequestException("One or more add-ons are invalid.");
      }
      const hasMismatchedCategoryAddOn = addOns.some(
        (addOn) => addOn.categoryId && addOn.categoryId !== dto.categoryId,
      );
      if (hasMismatchedCategoryAddOn) {
        throw new BadRequestException(
          "One or more add-ons do not belong to the selected category.",
        );
      }
    }

    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        imageUrl:
          dto.imageUrl === undefined ? undefined : dto.imageUrl?.trim() || null,
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
    if (dto.addOnIds) {
      const currentItem = await this.prisma.menuItem.findUnique({
        where: { id },
        select: { categoryId: true },
      });
      if (!currentItem) {
        throw new NotFoundException("Menu item not found.");
      }
      const targetCategoryId = dto.categoryId ?? currentItem.categoryId;
      if (dto.addOnIds.length) {
        const addOns = await this.prisma.addOn.findMany({
          where: { id: { in: dto.addOnIds } },
          select: { id: true, categoryId: true },
        });
        if (addOns.length !== dto.addOnIds.length) {
          throw new BadRequestException("One or more add-ons are invalid.");
        }
        const hasMismatchedCategoryAddOn = addOns.some(
          (addOn) => addOn.categoryId && addOn.categoryId !== targetCategoryId,
        );
        if (hasMismatchedCategoryAddOn) {
          throw new BadRequestException(
            "One or more add-ons do not belong to the selected category.",
          );
        }
      }
    }

    const item = await this.prisma.menuItem.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        imageUrl:
          dto.imageUrl === undefined ? undefined : dto.imageUrl?.trim() || null,
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

  async uploadMenuImage(file: UploadedMenuImageFile) {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    if (!MenuService.ALLOWED_MENU_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Unsupported image format. Use JPG, PNG, WEBP, or AVIF.",
      );
    }

    if (file.size > MenuService.MAX_MENU_IMAGE_SIZE_BYTES) {
      throw new BadRequestException("Image size exceeds 5MB.");
    }

    const supabaseUrl = this.configService.get<string>("SUPABASE_URL")?.trim();
    const serviceRoleKey = this.configService
      .get<string>("SUPABASE_SERVICE_ROLE_KEY")
      ?.trim();
    const bucket =
      this.configService.get<string>("SUPABASE_STORAGE_BUCKET")?.trim() ||
      "product-images";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException(
        "Supabase storage is not configured on the server.",
      );
    }

    const normalizedSupabaseUrl = supabaseUrl.replace(/\/+$/, "");
    const extension = this.resolveExtension(file.originalname, file.mimetype);
    const objectPath = `menu-items/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

    const encodedBucket = encodeURIComponent(bucket);
    const encodedObjectPath = objectPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const uploadResponse = await fetch(
      `${normalizedSupabaseUrl}/storage/v1/object/${encodedBucket}/${encodedObjectPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": file.mimetype,
          "x-upsert": "false",
        },
        body: new Uint8Array(file.buffer),
      },
    );

    if (!uploadResponse.ok) {
      let details = "";
      try {
        const errorBody = (await uploadResponse.json()) as {
          message?: string;
          error?: string;
        };
        details = errorBody.message || errorBody.error || "";
      } catch {
        // Ignore body parse failures and fall back to status text.
      }
      throw new BadRequestException(
        details || "Failed to upload image to storage.",
      );
    }

    return {
      bucket,
      path: objectPath,
      publicUrl: `${normalizedSupabaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedObjectPath}`,
    };
  }

  async deleteMenuItem(id: string) {
    await this.prisma.menuItemAddOn.deleteMany({ where: { menuItemId: id } });
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async createDeal(dto: CreateDealDto): Promise<ResolvedDeal> {
    const normalizedBundleItems = await this.normalizeDealBundleItems(dto.bundleItems);

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

  async updateDeal(id: string, dto: UpdateDealDto): Promise<ResolvedDeal> {
    const existingDeal = await this.prisma.deal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingDeal) {
      throw new NotFoundException("Deal not found.");
    }

    const normalizedBundleItems = dto.bundleItems
      ? await this.normalizeDealBundleItems(dto.bundleItems)
      : null;

    const updatedDeal = await this.prisma.deal.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim(),
        tag: dto.tag === undefined ? undefined : dto.tag.trim() || "Deal",
        imageUrl: dto.imageUrl === undefined ? undefined : dto.imageUrl.trim() || null,
        discountCents: dto.discountCents,
        isActive: dto.isActive,
        bundleItems: normalizedBundleItems
          ? {
              deleteMany: {},
              create: normalizedBundleItems.map((item, index) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                position: index,
              })),
            }
          : undefined,
      },
      include: this.dealInclude,
    });

    return this.resolveDeal(updatedDeal);
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

  private resolveExtension(fileName: string, mimetype: string) {
    const normalized = fileName.trim().toLowerCase();
    const fileNameExtension =
      normalized.lastIndexOf(".") > -1
        ? normalized.slice(normalized.lastIndexOf(".") + 1)
        : "";

    if (fileNameExtension && /^[a-z0-9]+$/.test(fileNameExtension)) {
      return fileNameExtension;
    }

    switch (mimetype) {
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/avif":
        return "avif";
      default:
        return "jpg";
    }
  }
}
