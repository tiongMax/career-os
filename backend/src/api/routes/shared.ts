import { z } from "zod";

import { AppError } from "../errors.js";

export const errorResponseSchema = z.object({
  error: z.string(),
});

export const idParamsSchema = z.strictObject({
  id: z.string(),
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUUID(id: string, message: string): string {
  if (!uuidPattern.test(id)) {
    throw new AppError(message, 400);
  }
  return id;
}
