import { z } from "zod";

const schema = z.object({
    HOST: z.string().default("localhost"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    PRODUCTION: z.string().default("false").transform(v => v !== "false"),
    PG_HOST: z.string(),
    PG_PORT: z.coerce.number().int().positive().default(5432),
    PG_USER: z.string(),
    PG_DATABASE: z.string(),
    PG_PASS: z.string()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error("Failed to parse environment: invalid or missing variables");
}

export const env = {
    ...parsed.data
};
