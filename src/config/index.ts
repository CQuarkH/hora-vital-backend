import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const DATABASE_URL = process.env.DATABASE_URL || "";

export const JWT_SECRET =
  process.env.JWT_SECRET ?? "changeme_in_dev_use_secure_secret_in_prod";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "24h";
export const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
