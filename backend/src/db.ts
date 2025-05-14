import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "node:path";
import "dotenv/config";

const databaseFileName = `file:${path.join(
  process.env.DB_FILE_DIR ?? "../database",
  process.env.DB_FILE_NAME ?? "database.db",
)}`;

export const client = createClient({
  url: databaseFileName,
});

export const db = drizzle(client, { logger: true });
