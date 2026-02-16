import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateAddOnDto } from "./dto/create-add-on.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateDealDto } from "./dto/create-deal.dto";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { ListPublicDealsQueryDto } from "./dto/list-public-deals-query.dto";
import { UpdateAddOnDto } from "./dto/update-add-on.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
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
  @Put("admin/menu/categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/menu/categories/:id")
  deleteCategory(@Param("id") id: string) {
    return this.menuService.deleteCategory(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/menu/add-ons")
  createAddOn(@Body() dto: CreateAddOnDto) {
    return this.menuService.createAddOn(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put("admin/menu/add-ons/:id")
  updateAddOn(@Param("id") id: string, @Body() dto: UpdateAddOnDto) {
    return this.menuService.updateAddOn(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/menu/add-ons/:id")
  deleteAddOn(@Param("id") id: string) {
    return this.menuService.deleteAddOn(id);
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
  @Put("admin/menu/deals/:id")
  updateDeal(@Param("id") id: string, @Body() dto: UpdateDealDto) {
    return this.menuService.updateDeal(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/menu/deals/:id")
  deleteDeal(@Param("id") id: string) {
    return this.menuService.deleteDeal(id);
  }
}
