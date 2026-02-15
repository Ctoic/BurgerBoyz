import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CheckDeliveryZoneDto } from "./dto/check-delivery-zone.dto";
import { CreateDeliveryZoneDto } from "./dto/create-delivery-zone.dto";
import { ListDeliveryZonesQueryDto } from "./dto/list-delivery-zones-query.dto";
import { UpdateDeliveryZoneDto } from "./dto/update-delivery-zone.dto";
import { DeliveryZonesService } from "./delivery-zones.service";

@Controller()
export class DeliveryZonesController {
  constructor(private readonly deliveryZonesService: DeliveryZonesService) {}

  @Post("delivery-zones/check")
  checkAddress(@Body() dto: CheckDeliveryZoneDto) {
    return this.deliveryZonesService.checkAddress(dto);
  }

  @Get("delivery-zones")
  listActiveZones() {
    return this.deliveryZonesService.listActiveZones();
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/delivery-zones")
  listZones(@Query() query: ListDeliveryZonesQueryDto) {
    return this.deliveryZonesService.listZones(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/delivery-zones")
  createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.createZone(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put("admin/delivery-zones/:id")
  updateZone(@Param("id") id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveryZonesService.updateZone(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("admin/delivery-zones/:id")
  deleteZone(@Param("id") id: string) {
    return this.deliveryZonesService.deleteZone(id);
  }
}
