import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function parseCorsOrigin(value: string | undefined) {
  if (!value) {
    return true;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: parseCorsOrigin(config.get<string>("CORS_ORIGIN")),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get<string>("APP_PORT") ?? 4001);
  await app.listen(port);

  logger.log(`Expense Tracker API is running on http://localhost:${port}/api`);
}

void bootstrap();
