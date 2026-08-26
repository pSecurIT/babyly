import { z } from "zod";

const envSchema = z.object({
  ENVIRONMENT_NAME: z.string().trim().min(2).max(64).default("local-dev"),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  ACCESS_CODE: z.string().trim().min(6).max(120),
  SESSION_SECRET: z.string().min(32),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  EMAIL_DELIVERY_MODE: z.enum(["console", "provider"]).default("console"),
  ADMIN_EMAILS: z.string().default(""),
  PRIVACY_CONTACT_EMAIL: z.string().email(),
}).superRefine((values, ctx) => {
  if (
    process.env.NODE_ENV === "production" &&
    values.ENVIRONMENT_NAME.toLowerCase() === "default"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "ENVIRONMENT_NAME mag in productie niet 'default' zijn.",
      path: ["ENVIRONMENT_NAME"],
    });
  }
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Ongeldige environment configuratie: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function adminEmailSet(): Set<string> {
  const env = getEnv();
  return new Set(
    env.ADMIN_EMAILS.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}
