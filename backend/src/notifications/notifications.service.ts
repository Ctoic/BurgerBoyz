import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";

export interface AdminNotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  sentAt: string;
  sendCount: number;
}

@Injectable()
export class NotificationsService {
  private notifications: AdminNotificationItem[] = [];

  listNotifications(query: ListNotificationsQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);

    const sortedNotifications = [...this.notifications].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );

    const start = (page - 1) * pageSize;
    const items = sortedNotifications.slice(start, start + pageSize);

    return buildPaginatedResponse(
      items,
      sortedNotifications.length,
      page,
      pageSize,
    );
  }

  createAndSendNotification(input: CreateNotificationDto) {
    const now = new Date().toISOString();
    const notification: AdminNotificationItem = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      createdAt: now,
      sentAt: now,
      sendCount: 1,
    };

    this.notifications.unshift(notification);
    return notification;
  }

  resendNotification(id: string) {
    const index = this.notifications.findIndex(
      (notification) => notification.id === id,
    );
    if (index < 0) {
      throw new NotFoundException("Notification not found.");
    }

    const existing = this.notifications[index];
    const updated: AdminNotificationItem = {
      ...existing,
      sentAt: new Date().toISOString(),
      sendCount: existing.sendCount + 1,
    };

    this.notifications[index] = updated;
    return updated;
  }
}
