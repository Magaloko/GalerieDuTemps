import type { Metadata } from "next";
import { requireFeature } from "@/lib/db/feature-flags";
import { WunschlistePage } from "./wunschliste-client";

export const metadata: Metadata = {
  title:       "Список желаний",
  description: "Сохранённые товары — вернитесь к ним позже.",
  alternates:  { canonical: "/wunschliste" },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireFeature("wunschliste");
  return <WunschlistePage />;
}
