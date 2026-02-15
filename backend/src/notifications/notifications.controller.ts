import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("admin/notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(@Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.listNotifications(query);
  }

  @Post()
  createAndSendNotification(@Body() body: CreateNotificationDto) {
    return this.notificationsService.createAndSendNotification(body);
  }

  @Post(":id/resend")
  resendNotification(@Param("id") id: string) {
    return this.notificationsService.resendNotification(id);
  }
}
