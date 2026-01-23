import { z } from "zod";
import dotenv from "dotenv";

const PRODUCTION: boolean = process.env.NODE_ENV === "production";

const schema = z.object({
    HOST: z.string().default("localhost"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default("1d"),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    GITHUB_REDIRECT_URI: z.string(),
    PG_HOST: z.string(),
    PG_PORT: z.coerce.number().int().positive().default(5432),
    PG_USER: z.string(),
    PG_DATABASE: z.string(),
    PG_PASS: z.string(),
    EMAIL_HOST: z.string(),
    EMAIL_PORT: z.coerce.number().int().positive().default(465),
    EMAIL_SECURE: z
        .string()
        .refine((val) => ["true", "false", "1", "0"].includes(val))
        .transform((val) => val === "true" || val === "1")
        .default(true),
    EMAIL_USERNAME: z.string(),
    EMAIL_PASSWORD: z.string(),
    EMAIL_FROM: z.string(),
    S3_ENDPOINT: z.string(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_BUCKET_NAME: z.string(),
    S3_REGION: z.string(),
    ADMIN_EMAIL: z.string(),
});

if (!PRODUCTION) {
    dotenv.config({ quiet: true });
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error("Failed to parse environment: invalid or missing variables");
}

export const env = {
    PRODUCTION,
    ...parsed.data
};
