import { Injectable } from "@nestjs/common";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { ListSupportThreadsQueryDto } from "./dto/list-support-threads-query.dto";

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateThread(userId: string) {
    const existing = await this.prisma.supportThread.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.supportThread.create({
      data: {
        userId,
      },
    });
  }

  async getThreadWithMessages(threadId: string) {
    return this.prisma.supportThread.findUnique({
      where: { id: threadId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async listThreads(query: ListSupportThreadsQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);
    const search = query.search?.trim().toLowerCase();

    const threads = await this.prisma.supportThread.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    });

    if (threads.length === 0) {
      return {
        ...buildPaginatedResponse([], 0, page, pageSize),
        totalUnreadCount: 0,
      };
    }

    const threadIds = threads.map((thread) => thread.id);

    const [lastMessages, customerMessages] = await Promise.all([
      this.prisma.supportMessage.findMany({
        where: { threadId: { in: threadIds } },
        orderBy: [{ threadId: "asc" }, { createdAt: "desc" }],
        distinct: ["threadId"],
      }),
      this.prisma.supportMessage.findMany({
        where: {
          threadId: { in: threadIds },
          sender: "CUSTOMER",
        },
        select: {
          threadId: true,
          createdAt: true,
        },
      }),
    ]);

    const lastMessageByThreadId = new Map(
      lastMessages.map((message) => [message.threadId, message]),
    );

    const lastReadAtAdminByThreadId = new Map(
      threads.map((thread) => [thread.id, thread.lastReadAtAdmin]),
    );

    const unreadCountByThreadId = new Map<string, number>();
    for (const message of customerMessages) {
      const lastReadAtAdmin = lastReadAtAdminByThreadId.get(message.threadId);
      if (!lastReadAtAdmin || message.createdAt > lastReadAtAdmin) {
        unreadCountByThreadId.set(
          message.threadId,
          (unreadCountByThreadId.get(message.threadId) ?? 0) + 1,
        );
      }
    }

    const enriched = threads.map((thread) => ({
      ...thread,
      lastMessage: lastMessageByThreadId.get(thread.id) ?? null,
      unreadCount: unreadCountByThreadId.get(thread.id) ?? 0,
    }));
    const totalUnreadCount = enriched.reduce(
      (total, thread) => total + thread.unreadCount,
      0,
    );
    const filteredThreads = search
      ? enriched.filter((thread) => {
          return (
            thread.user.email.toLowerCase().includes(search) ||
            (thread.user.name ?? "").toLowerCase().includes(search)
          );
        })
      : enriched;

    const start = (page - 1) * pageSize;
    const items = filteredThreads.slice(start, start + pageSize);

    return {
      ...buildPaginatedResponse(items, filteredThreads.length, page, pageSize),
      totalUnreadCount,
    };
  }

  async listMessagesForUser(userId: string) {
    const thread = await this.getOrCreateThread(userId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    });
    return { thread, messages };
  }

  async createMessage(threadId: string, sender: "CUSTOMER" | "ADMIN", body: string) {
    return this.prisma.supportMessage.create({
      data: {
        threadId,
        sender,
        body,
      },
    });
  }

  async markRead(threadId: string, role: "customer" | "admin") {
    const data =
      role === "customer"
        ? { lastReadAtCustomer: new Date() }
        : { lastReadAtAdmin: new Date() };
    return this.prisma.supportThread.update({
      where: { id: threadId },
      data,
    });
  }

  async getUnreadCountForCustomer(userId: string) {
    const thread = await this.getOrCreateThread(userId);
    return this.prisma.supportMessage.count({
      where: {
        threadId: thread.id,
        sender: "ADMIN",
        createdAt: thread.lastReadAtCustomer
          ? { gt: thread.lastReadAtCustomer }
          : undefined,
      },
    });
  }
}
