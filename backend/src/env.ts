import { z } from "zod";
import dotenv from "dotenv";

const PRODUCTION: boolean = process.env.NODE_ENV === "production";

const schema = z.object({
    HOST: z.string().default("localhost"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    PG_HOST: z.string(),
    PG_PORT: z.coerce.number().int().positive().default(5432),
    PG_USER: z.string(),
    PG_DATABASE: z.string(),
    PG_PASS: z.string()
});

if (!PRODUCTION) {
    dotenv.config();
}

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error("Failed to parse environment: invalid or missing variables");
}

export const env = {
    PRODUCTION,
    ...parsed.data
};
