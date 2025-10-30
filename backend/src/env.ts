import { z } from "zod";

const schema = z.object({
    HOST: z.string().default("localhost"),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    PRODUCTION: z.coerce.boolean().default(true)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    throw new Error("Failed to parse environment: invalid or missing variables");
}

export const env = {
    ...parsed.data
};
