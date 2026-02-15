import { Module } from "@nestjs/common";
import { DeliveryZonesModule } from "../delivery-zones/delivery-zones.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [DeliveryZonesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
