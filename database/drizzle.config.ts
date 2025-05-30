import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseFileName =
  "file:" +
  path.join(
    process.env.DB_FILE_DIR ?? "./",
    process.env.DB_FILE_NAME ?? "database.db"
  );

// 何故か, databaseMigrationsDir が絶対パスだとエラーになるため、相対パスで指定する必要がある。
const databaseMigrationsDir = process.env.DB_FILE_DIR
  ? path.relative(process.cwd(), path.join(process.env.DB_FILE_DIR, "drizzle"))
  : "./drizzle";

console.log("Database file:", databaseFileName);
console.log("Migrations directory:", databaseMigrationsDir);

export default defineConfig({
  out: databaseMigrationsDir,
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFileName,
  },
});
