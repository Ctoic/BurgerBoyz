import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  const frontendOriginEnv =
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173,http://localhost:8080";
  const configuredOrigins = frontendOriginEnv
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  const allowedOrigins = new Set(
    [...configuredOrigins, "http://localhost:4173"].map((origin) =>
      normalizeOrigin(origin),
    ),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedRequestOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedRequestOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS.`), false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  });

  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

void bootstrap();
