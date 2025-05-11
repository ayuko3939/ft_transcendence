import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseFileName =
  "file:" +
  path.join(
    process.env.DB_FILE_DIR ?? "./",
    process.env.DB_FILE_NAME ?? "database.db"
  );

const databaseMigrationsDir = path.join(
  process.env.DB_FILE_DIR ?? "./",
  "drizzle"
);

export default defineConfig({
  out: databaseMigrationsDir,
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFileName,
  },
});
