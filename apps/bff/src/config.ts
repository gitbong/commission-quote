import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce
    .number({ error: "PORT must be a whole number between 1 and 65535" })
    .int("PORT must be a whole number between 1 and 65535")
    .min(1, "PORT must be a whole number between 1 and 65535")
    .max(65535, "PORT must be a whole number between 1 and 65535")
    .default(3000),
  VENDOR_BASE_URL: z
    .url({ error: "VENDOR_BASE_URL must be a valid URL" })
    .default("http://localhost:5001"),
  VENDOR_API_KEY: z
    .string({ error: "VENDOR_API_KEY is required" })
    .min(1, "VENDOR_API_KEY is required"),
  VENDOR_TIMEOUT_MS: z.coerce
    .number({ error: "VENDOR_TIMEOUT_MS must be a positive whole number" })
    .int("VENDOR_TIMEOUT_MS must be a positive whole number")
    .positive("VENDOR_TIMEOUT_MS must be a positive whole number")
    .default(5000),
});

export interface Config {
  port: number;
  vendorBaseUrl: string;
  vendorApiKey: string;
  vendorTimeoutMs: number;
}

/** Reads and validates the environment. Throws, listing every problem, so startup fails fast. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Messages only: never echo the values (VENDOR_API_KEY is a secret).
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }

  const { PORT, VENDOR_BASE_URL, VENDOR_API_KEY, VENDOR_TIMEOUT_MS } =
    parsed.data;
  return {
    port: PORT,
    vendorBaseUrl: VENDOR_BASE_URL,
    vendorApiKey: VENDOR_API_KEY,
    vendorTimeoutMs: VENDOR_TIMEOUT_MS,
  };
}
