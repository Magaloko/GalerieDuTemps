import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Отписка подтверждена" };

export default function AbgemeldetPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className="inline-flex p-4 bg-vintage-sage/10 border border-vintage-sage/30 mb-6" style={{ borderRadius: "50%" }}>
            <CheckCircle2 className="w-10 h-10 text-vintage-sage" />
          </div>
          <h1 className="font-serif text-3xl text-vintage-espresso mb-4">Вы отписались</h1>
          <p className="text-vintage-dust font-sans text-sm mb-6">
            Вы больше не будете получать наши рассылки. Жаль, что вы уходите — если возникнут
            вопросы, всегда пишите нам на{" "}
            <a href="mailto:bonjour@galeriedutemps.kz" className="text-vintage-brown underline">bonjour@galeriedutemps.kz</a>.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
            На главную
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
