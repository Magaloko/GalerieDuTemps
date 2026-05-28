import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegistrierungsFormular } from "./registrierungs-formular";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Создать аккаунт" };

export default async function RegistrierenPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const sp  = await searchParams;
  const tab = sp.tab === "business" ? "business" : "privat";

  return (
    <AuthShell
      eyebrow="Регистрация"
      titel="Создать аккаунт"
      size="wide"
      footer={
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Уже есть аккаунт?{" "}
          <Link
            href="/kunde/anmelden"
            className="hover:opacity-80 transition-opacity"
            style={{
              color:                "var(--color-coral)",
              textDecoration:       "underline",
              textUnderlineOffset:  2,
            }}
          >
            Войти
          </Link>
        </p>
      }
    >
      <RegistrierungsFormular initialTab={tab as "privat" | "business"} />
    </AuthShell>
  );
}
