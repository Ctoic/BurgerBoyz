import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CustomerJwtAuthGuard } from "../auth/guards/customer-jwt.guard";
import { SupportMessageDto } from "./dto/support-message.dto";
import { SupportService } from "./support.service";

@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @UseGuards(CustomerJwtAuthGuard)
  @Get("thread")
  async getThread(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    if (!user) return null;
    return this.supportService.listMessagesForUser(user.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Post("messages")
  async createMessage(@Req() req: Request, @Body() body: SupportMessageDto) {
    const user = req.user as { id: string } | undefined;
    if (!user) return null;
    const thread = await this.supportService.getOrCreateThread(user.id);
    await this.supportService.createMessage(thread.id, "CUSTOMER", body.body);
    return this.supportService.listMessagesForUser(user.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Post("read")
  async markRead(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    if (!user) return null;
    const thread = await this.supportService.getOrCreateThread(user.id);
    await this.supportService.markRead(thread.id, "customer");
    return { ok: true };
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get("unread-count")
  async unreadCount(@Req() req: Request) {
    const user = req.user as { id: string } | undefined;
    if (!user) return { count: 0 };
    const count = await this.supportService.getUnreadCountForCustomer(user.id);
    return { count };
  }
}
