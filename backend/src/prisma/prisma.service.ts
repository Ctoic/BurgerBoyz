import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
    const isSupabaseDirect = url.hostname.endsWith(".supabase.co");

    if (isSupabasePooler) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
      if (!url.searchParams.has("sslmode")) {
        url.searchParams.set("sslmode", "require");
      }
    }

    if (isSupabaseDirect && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const normalizedDatabaseUrl = normalizeSupabaseUrl(process.env.DATABASE_URL);
    super(
      normalizedDatabaseUrl
        ? {
            datasources: {
              db: {
                url: normalizedDatabaseUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientInitializationError &&
        error.errorCode === "P1001"
      ) {
        this.logger.error(
          'Prisma could not reach the database (P1001). Verify DATABASE_URL host/port, ensure Supabase URLs include "sslmode=require", and use "db.<project-ref>.supabase.co:5432" for DIRECT_URL.',
        );
      }
      throw error;
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }
}
