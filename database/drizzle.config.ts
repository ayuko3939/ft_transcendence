import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseFileName =
  "file:" +
  path.join(
    process.env.DB_FILE_DIR ?? "./",
    process.env.DB_FILE_NAME ?? "database.db"
  );

console.log("Database file:", databaseFileName);
console.log("Migrations directory: ./drizzle (relative path)");

export default defineConfig({
  out: "./drizzle",
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFileName,
  },
});
