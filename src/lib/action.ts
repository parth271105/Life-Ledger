import { revalidatePath } from "next/cache";
import { z } from "zod";

export type Result = { error?: string; notice?: string };

/** Runs a mutation, turning validation/DB errors into a friendly message instead of a crash. */
export async function run(fn: () => Promise<string | void>, revalidate = true): Promise<Result> {
  try {
    const notice = await fn();
    if (revalidate) revalidatePath("/", "layout");
    return notice ? { notice } : {};
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Please check the form." };
    console.error(e);
    return { error: "Couldn't save that right now. Please try again in a moment." };
  }
}

export const form = (fd: FormData) => Object.fromEntries(fd);
