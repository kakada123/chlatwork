import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { ExpenseTrackerModule } from "./expense-tracker/expense-tracker.module";

type SupportedDatabaseType = "mysql" | "mariadb";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: (config.get<string>("DB_TYPE") ?? "mysql") as SupportedDatabaseType,
        host: config.get<string>("DB_HOST") ?? "127.0.0.1",
        port: Number(config.get<string>("DB_PORT") ?? 3306),
        username: config.get<string>("DB_USERNAME") ?? "root",
        password: config.get<string>("DB_PASSWORD") ?? "",
        database: config.get<string>("DB_DATABASE") ?? "chlatwork",
        autoLoadEntities: true,
        // Schema sync is useful for a new local database, but migrations are safer for production.
        synchronize: config.get<string>("DB_SYNC") === "true",
        logging: config.get<string>("DB_LOGGING") === "true",
      }),
    }),
    AuthModule,
    ExpenseTrackerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
