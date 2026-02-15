import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { MenuModule } from "./menu/menu.module";
import { OrdersModule } from "./orders/orders.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SettingsModule } from "./settings/settings.module";
import { UsersModule } from "./users/users.module";
import { SupportModule } from "./support/support.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DeliveryZonesModule } from "./delivery-zones/delivery-zones.module";
import { LocationModule } from "./location/location.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    SettingsModule,
    UsersModule,
    SupportModule,
    NotificationsModule,
    DeliveryZonesModule,
    LocationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
