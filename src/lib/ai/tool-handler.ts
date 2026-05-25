import type OpenAI from "openai";
import {
  katalogProdukte,
  oeffentlichesProduktBySlug,
  aehnlicheProdukte,
  featuredProdukte,
} from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import type { ProduktListItem } from "@/types/produkt";

// ---------------------------------------------------------------------------
// Result-Typ: enthält JSON-String für DeepSeek + Produkt-Referenzen für UI
// ---------------------------------------------------------------------------
export interface ToolErgebnis {
  /** JSON-Antwort für das LLM (kompakt) */
  inhalt:     string;
  /** Produkte, die in der UI als Karten gerendert werden sollen */
  referenzen: ProduktListItem[];
}

/** Reduziert Produkt-Felder für LLM (spart Tokens) */
function kompakt(p: ProduktListItem & { era?: string | null }): Record<string, unknown> {
  return {
    slug:       p.slug,
    name:       p.name,
    preis_eur:  p.preis,
    kategorie:  p.kategorie_name,
    era:        p.era ?? undefined,
    zustand:    p.zustand,
    verfuegbar: !p.verkauft && p.lagerbestand > 0,
  };
}

// ---------------------------------------------------------------------------
// Tool-Dispatcher
// ---------------------------------------------------------------------------
export async function executeTool(
  call: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<ToolErgebnis> {
  // Type-Narrowing: nur function-tools werden unterstützt
  if (call.type !== "function") {
    return { inhalt: JSON.stringify({ fehler: "Nicht unterstützter Tool-Typ" }), referenzen: [] };
  }

  const fn = call.function;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(fn.arguments || "{}");
  } catch {
    return { inhalt: JSON.stringify({ fehler: "Ungültige Argumente" }), referenzen: [] };
  }

  try {
    switch (fn.name) {

      // ─── suche_produkte ─────────────────────────────────────────────
      case "suche_produkte": {
        const daten = await katalogProdukte({
          suche:        args.stichwort      as string | undefined,
          kategorie:    args.kategorie_slug as string | undefined,
          min_preis:    args.min_preis      as number | undefined,
          max_preis:    args.max_preis      as number | undefined,
          era:          args.era            as string | undefined,
          zustand:      args.zustand        as string | undefined,
          limit:        Math.min(10, (args.limit as number) ?? 5),
        });
        return {
          inhalt: JSON.stringify({
            gefunden: daten.gesamt,
            produkte: daten.items.map(kompakt),
          }),
          referenzen: daten.items,
        };
      }

      // ─── produkt_details ────────────────────────────────────────────
      case "produkt_details": {
        const slug    = String(args.produkt_slug ?? "");
        const produkt = await oeffentlichesProduktBySlug(slug);
        if (!produkt) {
          return {
            inhalt:     JSON.stringify({ fehler: "Produkt nicht gefunden" }),
            referenzen: [],
          };
        }
        return {
          inhalt: JSON.stringify({
            slug:             produkt.slug,
            name:             produkt.name,
            preis_eur:        produkt.preis,
            originalpreis:    produkt.originalpreis,
            zustand:          produkt.zustand,
            era:              produkt.era,
            herkunft:         produkt.herkunft,
            material:         produkt.material,
            kategorie:        produkt.kategorie_name,
            kurzbeschreibung: produkt.kurzbeschreibung,
            beschreibung:     produkt.beschreibung?.slice(0, 500),
            verfuegbar:       !produkt.verkauft && produkt.lagerbestand > 0,
            tags:             produkt.tags,
          }),
          referenzen: [{
            id:              produkt.id,
            name:            produkt.name,
            slug:            produkt.slug,
            preis:           produkt.preis,
            originalpreis:   produkt.originalpreis,
            kategorie_name:  produkt.kategorie_name ?? null,
            zustand:         produkt.zustand,
            lagerbestand:    produkt.lagerbestand,
            verkauft:        produkt.verkauft,
            featured:        produkt.featured,
            hauptbild_url:   produkt.bilder?.[0]?.url ?? null,
            erstellt_am:     produkt.erstellt_am,
          }],
        };
      }

      // ─── preisvergleich ─────────────────────────────────────────────
      case "preisvergleich": {
        const slug     = String(args.produkt_slug ?? "");
        const referenz = await oeffentlichesProduktBySlug(slug);
        if (!referenz) {
          return {
            inhalt:     JSON.stringify({ fehler: "Referenz-Produkt nicht gefunden" }),
            referenzen: [],
          };
        }
        const aehnliche = await aehnlicheProdukte(
          referenz.id,
          referenz.kategorie_id,
          referenz.preis,
          5
        );
        const preise = aehnliche.map(p => p.preis);
        const stats  = preise.length > 0
          ? {
              min:    Math.min(...preise),
              max:    Math.max(...preise),
              durchschnitt: Math.round(preise.reduce((a, b) => a + b, 0) / preise.length),
            }
          : null;
        return {
          inhalt: JSON.stringify({
            referenz:     { name: referenz.name, preis: referenz.preis },
            vergleich:    aehnliche.map(kompakt),
            preisstatistik: stats,
          }),
          referenzen: aehnliche,
        };
      }

      // ─── empfehlungen ───────────────────────────────────────────────
      case "empfehlungen": {
        const basis  = String(args.basis ?? "featured");
        const anzahl = Math.min(8, (args.anzahl as number) ?? 4);

        let produkte: ProduktListItem[] = [];

        if (basis === "featured") {
          produkte = await featuredProdukte(anzahl);
        } else if (basis === "neu") {
          const daten = await katalogProdukte({ limit: anzahl, sortierung: "neu" });
          produkte = daten.items;
        } else if (basis === "kategorie") {
          const daten = await katalogProdukte({
            kategorie: args.basis_wert as string,
            limit:     anzahl,
          });
          produkte = daten.items;
        } else if (basis === "era") {
          const daten = await katalogProdukte({
            era:   args.basis_wert as string,
            limit: anzahl,
          });
          produkte = daten.items;
        }

        return {
          inhalt: JSON.stringify({
            basis,
            anzahl:    produkte.length,
            empfehlungen: produkte.map(kompakt),
          }),
          referenzen: produkte,
        };
      }

      // ─── kategorien_liste ───────────────────────────────────────────
      case "kategorien_liste": {
        const kats = await alleKategorien();
        return {
          inhalt: JSON.stringify({
            kategorien: kats
              .filter(k => (k.anzahl ?? 0) > 0)
              .map(k => ({ slug: k.slug, name: k.name, anzahl: k.anzahl })),
          }),
          referenzen: [],
        };
      }

      default:
        return {
          inhalt:     JSON.stringify({ fehler: `Unbekanntes Tool: ${fn.name}` }),
          referenzen: [],
        };
    }
  } catch (err) {
    console.error(`[Tool ${fn.name}] Fehler:`, err);
    return {
      inhalt:     JSON.stringify({ fehler: "Tool-Ausführung fehlgeschlagen" }),
      referenzen: [],
    };
  }
}
