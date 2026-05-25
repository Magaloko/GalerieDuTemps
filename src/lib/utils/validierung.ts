import { z } from "zod";

// ---------------------------------------------------------------------------
// Produkt Zod-Schemas
// ---------------------------------------------------------------------------

export const ProduktCreateSchema = z.object({
  name:            z.string().min(2, "Name muss mindestens 2 Zeichen haben").max(300),
  slug:            z.string().optional(),
  beschreibung:    z.string().optional(),
  kurzbeschreibung: z.string().max(500).optional(),
  preis:           z.coerce.number().positive("Preis muss positiv sein"),
  originalpreis:   z.coerce.number().positive().optional().nullable(),
  waehrung:        z.string().length(3).default("EUR"),
  kategorie_id:    z.coerce.number().int().positive().optional().nullable(),
  zustand:         z.enum(["sehr_gut", "gut", "akzeptabel", "restauriert"]).default("gut"),
  era:             z.string().max(50).optional(),
  herkunft:        z.string().max(100).optional(),
  material:        z.string().max(200).optional(),
  lagerbestand:    z.coerce.number().int().min(0).default(1),
  featured:        z.coerce.boolean().default(false),
  verkauft:        z.coerce.boolean().default(false),
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
  kategorie_id: z.coerce.number().int().optional(),
  zustand: z.string().optional(),
  sortierung: z.enum(["erstellt_am", "preis_asc", "preis_desc", "name"]).default("erstellt_am"),
});
