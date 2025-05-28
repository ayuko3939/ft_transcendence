import { defineConfig } from "drizzle-kit";

const databaseFileName = "file:../database/database.db";

export default defineConfig({
  out: "./src/drizzle/",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFileName,
  },
});