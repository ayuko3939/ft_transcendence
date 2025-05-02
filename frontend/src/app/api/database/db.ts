import { createClient } from "@libsql/client";
import path from "node:path";

const databaseFileName =
  "file:" +
  path.join(
    process.env.DB_FILE_DIR ?? "../database",
    process.env.DB_FILE_NAME ?? "database.db"
  );

export const client = createClient({
  url: process.env.NEXT_BUILD === 'true' ? "file:./dummy.db" : databaseFileName,
});
