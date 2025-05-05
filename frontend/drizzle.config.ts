import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:../database/database.db",
  },
});
