import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getDictionary } from "@/i18n";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <p className="text-vintage-gold text-2xl tracking-widest mb-4">✦ ✦ ✦</p>

          <h1 className="font-serif text-7xl md:text-8xl text-vintage-cream mb-2">
            404
          </h1>

          <div className="divider-ornament my-6 max-w-xs mx-auto">
            <span className="text-vintage-sand text-xs tracking-widest uppercase">
              Заблудились во времени
            </span>
          </div>

          <p className="font-serif text-2xl text-vintage-cream/80 mb-3">
            Страница не найдена
          </p>
          <p className="text-vintage-dust text-sm font-sans mb-10 leading-relaxed">
            Возможно, эта вещь была продана, перемещена — или просто
            потерялась в глубинах прошлого.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="
                inline-flex items-center justify-center gap-2
                px-6 py-3 bg-vintage-espresso text-vintage-cream
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-brown transition-colors
              "
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t.kunde.zur_hauptseite}
            </Link>
            <Link
              href="/katalog"
              className="
                inline-flex items-center justify-center gap-2
                px-6 py-3 border border-vintage-sand/40 text-vintage-cream/80
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-brown/40 transition-colors
              "
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <Search className="w-4 h-4" />
              {t.katalog.titel}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
