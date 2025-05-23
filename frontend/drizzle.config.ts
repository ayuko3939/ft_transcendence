import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseFileName = `file:${path.join(
  process.env.DB_FILE_DIR ?? "../database",
  process.env.DB_FILE_NAME ?? "database.db",
)}`;

export default defineConfig({
  out: "./drizzle/",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFileName,
  },
});
