import { z } from "zod";
import dotenv from "dotenv";

const dev_check_schema = z.object({
    PRODUCTION: z
        .string()
        .default("false")
        .transform((v) => v !== "false")
});

const schema = z.object({
    HOST: z.string().default("localhost"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    PRODUCTION: z
        .string()
        .default("false")
        .transform((v) => v !== "false"),
    PG_HOST: z.string(),
    PG_PORT: z.coerce.number().int().positive().default(5432),
    PG_USER: z.string(),
    PG_DATABASE: z.string(),
    PG_PASS: z.string()
});

let dev_check = dev_check_schema.safeParse(process.env);

if (!dev_check.success) {
    throw new Error("This should be unreachable! Error while parsing dev_check_schema");
}

if (!dev_check.data.PRODUCTION) {
    dotenv.config();
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error("Failed to parse environment: invalid or missing variables");
}

export const env = parsed.data;
