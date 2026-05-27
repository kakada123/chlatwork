import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type UserStatus = "PENDING" | "ACTIVE" | "DISABLED";

@Entity({ name: "users" })
export class User {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "varchar", length: 190, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  name!: string | null;

  @Column({ name: "password_hash", type: "varchar", length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({
    name: "telegram_user_id",
    type: "varchar",
    length: 32,
    unique: true,
    nullable: true,
  })
  telegramUserId!: string | null;

  @Column({
    name: "telegram_username",
    type: "varchar",
    length: 80,
    nullable: true,
  })
  telegramUsername!: string | null;

  @Column({
    name: "telegram_photo_url",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  telegramPhotoUrl!: string | null;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  status!: UserStatus;

  @Column({ name: "email_verified_at", type: "datetime", nullable: true })
  emailVerifiedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
