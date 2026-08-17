import "server-only";

import { notFound } from "next/navigation";
import { isApiNotFound } from "@/lib/api";

export async function requireEntity<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function optionalEntity<T>(
  request: Promise<T>,
): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (isApiNotFound(error)) return null;
    throw error;
  }
}
