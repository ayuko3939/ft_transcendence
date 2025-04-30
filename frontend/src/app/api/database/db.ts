import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
  url: process.env.DB_FILE_NAME ?? "file:../database/database.db",
});

export const db = drizzle(client, { logger: true });
