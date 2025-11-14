import { z } from "zod";

export const UUIDSchema = z.string().regex(/^.+-.+-.+-.+-.+$/, "Invalid UUID");
