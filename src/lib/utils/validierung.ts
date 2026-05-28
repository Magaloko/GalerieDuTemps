import { z } from "zod";

// ---------------------------------------------------------------------------
// Produkt Zod-Schemas
// ---------------------------------------------------------------------------

export const ProduktCreateSchema = z.object({
  name:            z.string().min(2, "Name muss mindestens 2 Zeichen haben").max(300),
  slug:            z.string().max(350).optional(),
  artikel_code:    z.string().max(20).optional().nullable(),
  beschreibung:    z.string().optional(),
  kurzbeschreibung: z.string().max(500).optional(),
  name_i18n:        z.record(z.string(), z.string()).optional(),
  kurzbeschreibung_i18n: z.record(z.string(), z.string()).optional(),
  beschreibung_i18n: z.record(z.string(), z.string()).optional(),
  preis:           z.coerce.number().positive("Preis muss positiv sein"),
  originalpreis:   z.coerce.number().positive().optional().nullable(),
  einkaufspreis:   z.coerce.number().nonnegative().optional().nullable(),
  b2b_preis:       z.coerce.number().positive().optional().nullable(),
  hauptbild_url:   z.string().max(500).optional().nullable(),
  rueckbild_url:   z.string().max(500).optional().nullable(),
  video_url:       z.string().max(500).optional().nullable(),
  instagram_urls:  z.array(z.string().url()).max(10).optional(),
  inhalt_blocks:   z.array(z.object({
    type:     z.enum(["heading", "text", "image", "highlight", "quote"]),
    text:     z.string().max(5000).optional(),
    bild_url: z.string().max(500).optional(),
    caption:  z.string().max(500).optional(),
  })).max(50).optional(),
  abmessungen:     z.object({
    breite:  z.coerce.number().nonnegative().optional(),
    hoehe:   z.coerce.number().nonnegative().optional(),
    tiefe:   z.coerce.number().nonnegative().optional(),
    gewicht: z.coerce.number().nonnegative().optional(),
  }).optional().nullable(),
  waehrung:        z.string().length(3).default("KZT"),
  kategorie_id:    z.coerce.number().int().positive().optional().nullable(),
  zustand:         z.enum(["sehr_gut", "gut", "akzeptabel", "restauriert"]).default("gut"),
  era:             z.string().max(50).optional(),
  herkunft:        z.string().max(100).optional(),
  material:        z.string().max(200).optional(),
  lagerbestand:    z.coerce.number().int().min(0).default(1),
  featured:        z.coerce.boolean().default(false),
  verkauft:        z.coerce.boolean().default(false),
  aktiv:           z.coerce.boolean().default(true),
  b2c_mode:        z.enum(["visible", "teaser", "hidden"]).default("visible"),
  seo_titel:       z.string().max(70).optional(),
  seo_beschreibung: z.string().max(160).optional(),
  tags:            z.union([
    z.array(z.string()),
    z.string().transform(s => s.split(",").map(t => t.trim()).filter(Boolean)),
  ]).optional(),
});

export const ProduktUpdateSchema = ProduktCreateSchema.partial();

export type ProduktCreateInput = z.infer<typeof ProduktCreateSchema>;
export type ProduktUpdateInput = z.infer<typeof ProduktUpdateSchema>;

// ---------------------------------------------------------------------------
// Kategorie Zod-Schema
// ---------------------------------------------------------------------------
export const KategorieCreateSchema = z.object({
  name:         z.string().min(2, "Name muss mindestens 2 Zeichen haben").max(100),
  slug:         z.string().max(120).optional(),
  code:         z.string().max(10).optional().nullable(),
  beschreibung: z.string().optional().nullable(),
  eltern_id:    z.coerce.number().int().positive().optional().nullable(),
  bild_url:     z.string().url().optional().nullable(),
  sortierung:   z.coerce.number().int().nonnegative().default(0),
  aktiv:        z.coerce.boolean().default(true),
});

export const KategorieUpdateSchema = KategorieCreateSchema.partial();

export type KategorieCreateInput = z.infer<typeof KategorieCreateSchema>;
export type KategorieUpdateInput = z.infer<typeof KategorieUpdateSchema>;

// ---------------------------------------------------------------------------
// Lead-Schemas (Unified-Inbox)
// ---------------------------------------------------------------------------
export const LeadStatusSchema = z.enum([
  "neu","gelesen","in_arbeit","beantwortet","qualifiziert","verloren","archiviert"
]);
export const LeadPrioritaetSchema = z.enum(["niedrig","normal","hoch","dringend"]);
export const LeadQuelleSchema = z.enum([
  "kontaktanfrage",
  "instagram_dm","instagram_comment","instagram_mention",
  "telegram","whatsapp","mail","manuell"
]);

// ---------------------------------------------------------------------------
// Bild-Schema
// ---------------------------------------------------------------------------
export const BildUpdateSchema = z.object({
  alt_text:      z.string().max(200).optional(),
  ist_hauptbild: z.boolean().optional(),
  sortierung:    z.number().int().min(0).optional(),
});

export type BildUpdateInput = z.infer<typeof BildUpdateSchema>;

// ---------------------------------------------------------------------------
// Paginierungs-Schema
// ---------------------------------------------------------------------------
export const PaginierungSchema = z.object({
  seite:  z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  suche:  z.string().optional(),
  kategorie:    z.string().optional(),           // slug-based filter
  kategorie_id: z.coerce.number().int().optional(),
  zustand: z.string().optional(),
  sortierung: z.enum(["erstellt_am", "preis_asc", "preis_desc", "name"]).default("erstellt_am"),
});
