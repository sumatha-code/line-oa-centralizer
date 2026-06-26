import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://educ_admin:P@ssw0rd_EducL1ne_2026_xYz!#@localhost:5432/line_gateway",
  },
});
