import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { landingPageBySlug } from "@/lib/db/landing-pages";
import { LandingBlocks } from "@/components/landing/landing-blocks";
import { getLocale } from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await landingPageBySlug(slug, true);
  if (!page) return { title: "Страница не найдена" };
  return {
    title: page.seo_titel || page.titel,
    description: page.seo_beschreibung || undefined,
  };
}

export default async function LandingPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, locale] = await Promise.all([
    landingPageBySlug(slug, true),
    getLocale(),
  ]);
  if (!page) notFound();

  return <LandingBlocks blocks={page.blocks ?? []} locale={locale} />;
}
