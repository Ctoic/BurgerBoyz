import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateAddOnDto } from "./dto/create-add-on.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateDealDto } from "./dto/create-deal.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { ListPublicDealsQueryDto } from "./dto/list-public-deals-query.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { MenuService } from "./menu.service";

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get("menu")
  getPublicMenu() {
    return this.menuService.getPublicMenu();
  }

  @Get("deals")
  getPublicDeals(@Query() query: ListPublicDealsQueryDto) {
    return this.menuService.getPublicDeals(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/menu")
  getAdminMenu() {
    return this.menuService.getAdminMenu();
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/menu/categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/menu/add-ons")
  createAddOn(@Body() dto: CreateAddOnDto) {
    return this.menuService.createAddOn(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/menu/items")
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put("admin/menu/items/:id")
  updateMenuItem(@Param("id") id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/menu/items/:id")
  deleteMenuItem(@Param("id") id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/menu/deals")
  createDeal(@Body() dto: CreateDealDto) {
    return this.menuService.createDeal(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/menu/deals/:id")
  deleteDeal(@Param("id") id: string) {
    return this.menuService.deleteDeal(id);
  }
}
