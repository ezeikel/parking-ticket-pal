import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local from apps/web (for local development)
// On Vercel, env vars are injected directly into process.env
dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env.local") });

// Get DATABASE_URL from process.env (works both locally and on Vercel)
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
