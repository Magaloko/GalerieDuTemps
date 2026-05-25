import { getDictionary } from "@/i18n";
import { KundeAnmeldenForm } from "./form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход — Galerie du Temps",
};

export default async function KundeAnmeldenPage() {
  const { t } = await getDictionary();
  return (
    <KundeAnmeldenForm
      labels={{
        mein_konto:     t.kunde.mein_konto,
        anmelden_titel: t.kunde.anmelden_titel,
        email:          t.allg.email,
        passwort:       t.kunde.passwort_label,
        anmelden_btn:   t.kunde.anmelden_btn,
        anmelden_lauft: t.kunde.anmelden_lauft,
        vergessen:      t.kunde.vergessen,
        kein_account:   t.kunde.kein_account,
        jetzt_register: t.kunde.jetzt_register,
        zur_hauptseite: t.kunde.zur_hauptseite,
      }}
    />
  );
}
