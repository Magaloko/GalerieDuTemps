/**
 * Vitest-Setup — globale Mocks.
 *
 * `next/cache` braucht zur Runtime einen Next.js-Static-Generation-Store
 * (sonst: "Invariant: static generation store missing in revalidateTag").
 * Den haben wir in Vitest natürlich nicht — also stubben wir die
 * relevanten Funktionen mit No-Ops.
 *
 * Greift für ALLE Tests die `next/cache` (transitiv via db/* imports)
 * laden — Pure-Function-Tests sind nicht betroffen, weil ihre Modules
 * keinen next/cache-Pfad ziehen.
 */

import { vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag:  vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}));
