# Journal-Artikel · Galerie du Temps

Sechs SEO+GEO-optimierte Russisch-sprachige Artikel basierend auf dem Buch
*"Style Me Vintage: Accessories"* (Naomi Thompson + Liz Tregenza, Pavilion Books)
und aktuellen Markt-/Trend-Daten 2025-2026.

## Artikel-Übersicht

| # | Slug | Titel | Fokus | Wörter |
|---|------|-------|-------|--------|
| 1 | `trendy-vintazha-2026-chto-nosyat` | Тренды винтажа 2026 | Y2K, тренды, музейные выставки | ~1900 |
| 2 | `bakelit-lyutsit-kak-otlichit-original` | Бакелит и люцит | Аутентификация, 4 теста | ~1700 |
| 3 | `hermes-birkin-kelly-istoriya-tsena-investitsiya` | Hermès Birkin/Kelly | История + инвестиция $10.1M | ~2200 |
| 4 | `kollektsionnaya-bizhuteriya-1920-1980` | Бижутерия по эпохам | Trifari, Coro, Haskell, Schiaparelli | ~2400 |
| 5 | `vintazhnye-perchatki-vozvrashchenie-2026` | Винтажные перчатки | Тренд +11%, уход, этикет | ~1800 |
| 6 | `vintazhnye-shlyapy-1920-1980-evolyutsiya` | Винтажные шляпки | Эволюция 1920-1980 | ~2100 |

**Suma:** ~12 100 Wörter unique RU-Content für Journal/SEO.

## Aufbau jedes Artikels (GEO-optimiert)

Jeder Artikel folgt einer einheitlichen Struktur, die **gut von KI-Suchmaschinen
zitiert wird** (ChatGPT, Perplexity, Claude, Google AI Overview):

1. **YAML-Frontmatter** mit `slug`, `titel`, `seo_titel`, `seo_beschreibung`, `excerpt`, `tags`
2. **H1-Titel** entspricht der `titel`
3. **«Если коротко:»-Block** im ersten Absatz — direkte Antwort auf Hauptfrage
   (GEO-Trigger: KI-Modelle picken diese 1-Satz-Antworten heraus)
4. **H2-Hauptsektionen** mit Schlüsselwörtern
5. **Tabellen + Listen** für strukturierte Daten
6. **Експерт-Zitate** + Buchverweise (Princeton-Studie: +41% Citation-Visibility)
7. **Konkrete Zahlen** (Preise 2026, Wachstumsraten, Auktions-Highlights)
8. **FAQ-Sektion** am Ende mit 5-6 Fragen (höchst-zitiertes Format in AI-Overviews)
9. **Interne Links** zu `/katalog`, `/kontakt` für Conversion
10. **Footer** mit Quellen-Attribution + Galerie du Temps · Алматы (Local-SEO)

## Wie importieren

### Option A: Über Script (empfohlen)

Voraussetzung: `DATABASE_URL` in `.env.local` gesetzt (Production-DB) oder als ENV.

```bash
# 1) Import als Entwurf (alle 6 Artikel)
node scripts/seed-journal.mjs

# 2) Im Admin (/admin/journal) — Cover-Bilder hochladen, Inhalt prüfen

# 3) Veröffentlichen (alle auf einmal):
node scripts/seed-journal.mjs --upsert --publish

# Re-Import nach Änderungen am Markdown:
node scripts/seed-journal.mjs --upsert
```

### Option B: Manuell im Admin

1. Öffne `/admin/journal/neu`
2. Titel kopieren aus Frontmatter (`titel:`)
3. Speichern → in den Edit-Mode wechseln
4. Frontmatter-Felder (excerpt, tags, seo_*) in die UI eintragen
5. Markdown-Body kopieren (alles unterhalb des zweiten `---`)
6. Cover-Bild hochladen
7. Veröffentlichen-Toggle aktivieren

## Cover-Bilder

Die Artikel referenzieren KEINE Cover-Bilder direkt. Du musst pro Artikel
ein passendes Bild auswählen und im Admin hochladen. Empfehlungen:

| Artikel | Bild-Stil |
|---------|-----------|
| 01 Тренды 2026 | Flat-Lay mit Y2K-Accessoires + Vintage-Mix |
| 02 Бакелит | Close-up bunter Bakelit-Armreifen (red/butterscotch) |
| 03 Hermès | Birkin-Silhouette in Cobalt-Setting, Detail Cadenas |
| 04 Бижутерия | Stilleben mit Trifari/Coro-Stücken auf Samt |
| 05 Перчатки | Lange Opera-Gloves auf Marmortisch oder Madonna-Style |
| 06 Шляпки | Pillbox + Cloche + Fedora arrangiert |

## Wie ergänzen/erweitern

Neue Artikel folgen demselben Frontmatter-Format:

```markdown
---
slug: my-new-article
titel: "..."
seo_titel: "..."
seo_beschreibung: "..."
excerpt: "..."
tags: ["...", "..."]
autor_name: "Galerie du Temps"
---

# H1-Titel hier

**Если коротко:** TLDR в 2-3 предложения.

## Раздел 1
...

## Часто задаваемые вопросы

### Вопрос 1?
Ответ.
```

Dann `node scripts/seed-journal.mjs` ausführen — neuer Artikel wird automatisch
importiert.

## SEO-Schlüsselwörter (für interne Verlinkung)

Diese Keywords erscheinen mehrfach und sollten ggf. mit Produkt-Seiten verlinkt
werden (in Markdown-Body als `[text](/katalog/...)`):

- винтажная бижутерия → `/kategorien/bizhuteriya`
- винтажные сумки → `/kategorien/sumki`
- винтажные шляпы → `/kategorien/shlyapy`
- винтажные перчатки → `/kategorien/perchatki`
- винтажные украшения Trifari → search by tag
- Hermès Birkin → `/katalog?suche=hermes`
- бакелит → search by tag

## Quellen

Primärquelle für alle Artikel:
- **"Style Me Vintage: Accessories"** — Naomi Thompson & Liz Tregenza
  (Pavilion Books, ISBN 978-1-909815-44-4)

Aktuelle Markt-Daten + 2026-Highlights:
- **Sotheby's** (Birkin-Auktion 2025)
- **Robb Report, Fortune** (Resale-Daten)
- **Privé Porter, Fashionphile** (aktuelle Preise)
- **Invaluable, LiveAuctioneers, Collectors Weekly** (Costume Jewelry)
- **Trendii, Pinterest Trends, Who What Wear** (2026 Trends)
- **V&A London, Fondation Alaïa, MFA Houston, SCAD FASH** (2026 Exhibitions)

GEO-Best-Practices basieren auf:
- **Princeton GEO Study** — Expert-Quotes +41%, Statistics +30%
- **Frase.io / Lumar** — FAQ-Schema, First-Paragraph-Answer
- **Perplexity citation analysis** — Reddit 46.5%, Wikipedia 47.9%

## Geschätzter SEO/GEO-Impact

- **Wörter total:** ~12 100 RU-Content
- **Long-tail Keywords:** ~150 unique (z.B. "как отличить бакелит", "цена Hermès Birkin 2026")
- **FAQ-Antworten:** 30+ direkt von KI zitierbare 2-3-Satz-Antworten
- **Internal links:** 20+ Verweise auf `/katalog`, `/kontakt`, `/about`
- **Markenautorität:** Erwähnung Hermès, Chanel, Dior, Schiaparelli, Trifari, Lilly Daché,
  Cornelia James, Lea Stein, Miriam Haskell, Eisenberg, Kenneth Jay Lane, Elsa Peretti
- **Local SEO:** "Алматы" + "Galerie du Temps" in jedem Artikel mehrfach

Erwartete Effekte nach Veröffentlichung + Indexierung (typisch 4-12 Wochen):
- +30-80% organische Suchzugriffe auf Journal-Page
- AI-Citations in ChatGPT/Perplexity bei spezifischen RU-Vintage-Anfragen
- Erweiterte Brand-Authority im KZ/RU-Vintage-Markt
