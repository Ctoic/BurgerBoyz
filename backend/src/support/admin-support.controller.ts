import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListSupportThreadsQueryDto } from "./dto/list-support-threads-query.dto";
import { SupportMessageDto } from "./dto/support-message.dto";
import { SupportService } from "./support.service";

@Controller("admin/support")
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @UseGuards(JwtAuthGuard)
  @Get("threads")
  async listThreads(@Query() query: ListSupportThreadsQueryDto) {
    return this.supportService.listThreads(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("threads/:id")
  async getThread(@Param("id") id: string) {
    return this.supportService.getThreadWithMessages(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("threads/:id/messages")
  async createMessage(@Param("id") id: string, @Body() body: SupportMessageDto) {
    await this.supportService.createMessage(id, "ADMIN", body.body);
    return this.supportService.getThreadWithMessages(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("threads/:id/read")
  async markRead(@Param("id") id: string) {
    await this.supportService.markRead(id, "admin");
    return { ok: true };
  }
}
