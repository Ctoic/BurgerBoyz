import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

function parsePositiveInteger(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.endsWith(".pooler.supabase.com");
    const isSupabaseDirect = url.hostname.endsWith(".supabase.co");
    const configuredConnectionLimit = parsePositiveInteger(
      process.env.DATABASE_POOL_CONNECTION_LIMIT,
    );
    const configuredPoolTimeout = parsePositiveInteger(
      process.env.DATABASE_POOL_TIMEOUT_SECONDS,
    );

    if (isSupabasePooler) {
      const existingConnectionLimit = parsePositiveInteger(
        url.searchParams.get("connection_limit"),
      );

      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      // Avoid single-connection bottlenecks in long-lived containers (e.g. Railway).
      // If URL has connection_limit=1, lift it to a safer default unless explicitly overridden.
      if (configuredConnectionLimit) {
        url.searchParams.set("connection_limit", String(configuredConnectionLimit));
      } else if (!existingConnectionLimit || existingConnectionLimit < 2) {
        url.searchParams.set("connection_limit", "5");
      }
      if (configuredPoolTimeout) {
        url.searchParams.set("pool_timeout", String(configuredPoolTimeout));
      } else if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "20");
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
