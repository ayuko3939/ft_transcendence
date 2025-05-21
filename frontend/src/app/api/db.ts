import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const databaseFileName = `file:${path.join(
  process.env.DB_FILE_DIR ?? "../database",
  process.env.DB_FILE_NAME ?? "database.db",
)}`;

export const client = createClient({
  url: process.env.NEXT_BUILD === "true" ? "file:./dummy.db" : databaseFileName,
});

export const db = drizzle(client, { logger: true });
