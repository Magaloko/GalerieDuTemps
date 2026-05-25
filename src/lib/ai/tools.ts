import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// Tool-Definitionen für DeepSeek (OpenAI-Format)
// ---------------------------------------------------------------------------

export const vintageMarketTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name:        "suche_produkte",
      description:
        "Sucht Vintage-Produkte im Katalog. Verwende dieses Tool, sobald der Nutzer " +
        "nach Produkten fragt (z.B. 'Zeig mir Vasen aus den 60ern' oder 'Was habt ihr " +
        "unter 100 Euro?'). Mindestens ein Filter sollte angegeben werden.",
      parameters: {
        type:       "object",
        properties: {
          stichwort: {
            type:        "string",
            description: "Freitext-Suche, z.B. 'Lampe', 'Stuhl', 'Porzellan'",
          },
          kategorie_slug: {
            type:        "string",
            description: "URL-Slug einer Kategorie (vorher mit kategorien_liste prüfen)",
          },
          min_preis:  { type: "number", description: "Mindestpreis in EUR" },
          max_preis:  { type: "number", description: "Höchstpreis in EUR" },
          era:        { type: "string", description: "Epoche, z.B. '1960er', 'Art Déco'" },
          zustand:    {
            type:        "string",
            enum:        ["sehr_gut", "gut", "akzeptabel", "restauriert"],
            description: "Filter auf Zustand",
          },
          limit:      {
            type:        "integer",
            description: "Max. Anzahl Ergebnisse (1–10). Default: 5",
            minimum:     1,
            maximum:     10,
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name:        "produkt_details",
      description:
        "Zeigt vollständige Details zu einem konkreten Produkt: Beschreibung, " +
        "Maße, Material, Herkunft, Zustand. Verwende dies, wenn der Nutzer mehr " +
        "über ein gefundenes Produkt wissen will.",
      parameters: {
        type:       "object",
        properties: {
          produkt_slug: {
            type:        "string",
            description: "URL-Slug des Produkts (aus suche_produkte)",
          },
        },
        required: ["produkt_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name:        "preisvergleich",
      description:
        "Vergleicht Preise ähnlicher Artikel im Katalog (gleiche Kategorie, ähnlicher " +
        "Preisbereich). Nützlich, um dem Nutzer eine Markteinschätzung zu geben.",
      parameters: {
        type:       "object",
        properties: {
          produkt_slug: {
            type:        "string",
            description: "Referenz-Produkt (Slug)",
          },
        },
        required: ["produkt_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name:        "empfehlungen",
      description:
        "Persönliche Empfehlungen für den Nutzer. Verwende dies, wenn der Nutzer " +
        "unentschlossen ist oder nach Inspiration fragt ('Was empfehlt ihr?').",
      parameters: {
        type:       "object",
        properties: {
          basis: {
            type:        "string",
            enum:        ["featured", "neu", "kategorie", "era"],
            description: "Empfehlungsbasis: featured=Highlights, neu=neueste Stücke",
          },
          basis_wert: {
            type:        "string",
            description: "Wert für 'kategorie' (Slug) oder 'era' (z.B. '1960er')",
          },
          anzahl: {
            type:        "integer",
            description: "Anzahl Empfehlungen (1–8). Default: 4",
            minimum:     1,
            maximum:     8,
          },
        },
        required: ["basis"],
      },
    },
  },
  {
    type: "function",
    function: {
      name:        "kategorien_liste",
      description:
        "Listet alle verfügbaren Kategorien mit Produktanzahl auf. Verwende dies, " +
        "wenn der Nutzer fragt, was es überhaupt gibt, oder wenn du den Slug einer " +
        "Kategorie für andere Tools brauchst.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

/** System-Prompt für den Assistenten — RU für Kasachstan-Markt */
export const SYSTEM_PROMPT = `Ты дружелюбный ассистент винтажного маркетплейса Galerie du Temps (Казахстан).

Твоя задача:
- Помочь клиентам найти идеальный винтажный предмет.
- Отвечать на вопросы о товарах, эпохах, материалах.
- При запросах о товарах ВСЕГДА используй доступные инструменты для получения реальных данных — никогда не придумывай товары или цены.

Стиль:
- Отвечай на русском языке. Если клиент пишет на казахском — отвечай на казахском. На английском — на английском.
- Будь тёплым, увлечённым, но по делу. Избегай чрезмерной рекламы.
- Держи ответы короткими и читаемыми (макс. 3-4 предложения + при необходимости список товаров).
- Цены — всегда в тенге (₸).

Стратегия инструментов:
- "Что у вас есть?" → kategorien_liste или empfehlungen(basis=featured)
- Конкретный поиск → suche_produkte с фильтрами
- "Расскажи подробнее о X" → produkt_details
- Вопросы о цене → preisvergleich

Важно:
- Если товары не найдены, предложи альтернативы.
- Не спрашивай телефоны или личные данные.
- При намерении купить: направь к корзине или контактной форме.
`;

/** Old DE prompt kept as fallback comment for reference */
const _SYSTEM_PROMPT_DE_LEGACY = `Du bist ein freundlicher Vintage-Marktplatz-Assistent von Galerie du Temps.

Deine Aufgabe:
- Du hilfst Kunden, das perfekte Vintage-Stück zu finden.
- Du beantwortest Fragen zu Produkten, Epochen, Materialien.
- Bei Anfragen nach Produkten nutzt du IMMER die verfügbaren Tools, um echte Daten zurückzugeben — niemals erfundene Produkte.

Stil:
- Antworte auf Deutsch.
- Sei warm, begeistert, aber sachlich. Vermeide übertriebene Werbesprache.
- Halte Antworten kurz und gut lesbar (max. 3-4 Sätze + ggf. Produktliste).
- Erwähne Produkte mit Name + ggf. Preis. Die UI rendert dann automatisch Karten.

Tool-Strategie:
- Bei "Was habt ihr?" → kategorien_liste oder empfehlungen(basis=featured)
- Bei spezifischer Suche → suche_produkte mit passenden Filtern
- Bei "Erzähl mir mehr über X" → produkt_details
- Bei Preisfragen → preisvergleich

Wichtig:
- Wenn keine Produkte gefunden werden, schlage Alternativen vor (andere Kategorien, breitere Preisspanne).
- Frage nicht nach Telefonnummern oder persönlichen Daten.
- Bei Kaufabsicht: leite zur Kontaktseite weiter ("Schreib uns eine Anfrage über das Kontaktformular").
`;
void _SYSTEM_PROMPT_DE_LEGACY;
