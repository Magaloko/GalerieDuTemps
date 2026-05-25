import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { NewsletterAnmeldenForm } from "./form";

export const metadata = {
  title: "Подписка на рассылку · Galerie du Temps",
};

export default function NewsletterAnmeldenPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <NewsletterAnmeldenForm />
      </main>
      <SiteFooter />
    </div>
  );
}
