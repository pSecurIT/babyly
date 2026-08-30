import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: {
      ENVIRONMENT_NAME: "test",
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      APP_BASE_URL: "http://localhost:3000",
      ACCESS_CODE: "test-code-123456",
      SESSION_SECRET: "test-secret-32-character-minimum-1",
      MAGIC_LINK_TTL_MINUTES: "15",
      EMAIL_DELIVERY_MODE: "console",
      ADMIN_EMAILS: "admin@test.com",
      PRIVACY_CONTACT_EMAIL: "privacy@test.com",
      PREDICTION_DEADLINE_DATE: "2026-12-20T23:59:59Z",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
