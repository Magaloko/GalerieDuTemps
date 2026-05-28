# Storage-Strategie: Produkt-Fotos für immer sicher speichern

> Ziel: Produkt-Fotos müssen **dauerhaft, redundant, mit Backup** gespeichert
> sein. Kein Datenverlust bei Deploys, Disk-Defekt oder Server-Umzug.

---

## 1. IST-Zustand (und warum riskant)

**Aktuell:** Fotos liegen als Dateien im Container-Filesystem.

```
upload.ts:
  uploadDirGet()  → process.env.UPLOAD_DIR ?? <projekt>/public/uploads
  publicUrlFor()  → NEXT_PUBLIC_UPLOAD_URL ?? "/uploads"
DB:
  produktbilder.url / .url_thumb / .url_medium / .url_large  (Pfad-Strings)
  produkte.hauptbild_url
Pipeline:
  Original (komprimiert) + 3 WebP-Varianten (thumb/medium/large) pro Bild
```

**Risiken — vom kritischsten zum kleinsten:**

| # | Risiko | Folge | Wahrscheinlichkeit |
|---|--------|-------|-------------------|
| R1 | Kein Persistent Volume → Container-Rebuild | **ALLE Fotos weg** | hoch (jeder Deploy) |
| R2 | Volume da, aber Single-Disk-Defekt | Totalverlust ohne Backup | mittel |
| R3 | Host/VPS stirbt oder Coolify-Migration | Volume weg | mittel |
| R4 | Kein Backup | Kein Recovery möglich | — |
| R5 | DB-Row ohne Datei / Datei ohne DB-Row | Kaputte Bilder, Müll | hoch (passiert schon) |
| R6 | Kein CDN | langsam (KZ↔Server-Latenz), Server-Bandbreite | mittel |
| R7 | Skalierung auf 2+ Container unmöglich | jeder Container eigene Disk | niedrig (jetzt) |

**Fazit:** Filesystem im Container ist für „für immer" grundsätzlich ungeeignet.
Selbst MIT Volume bleiben R2–R6 offen.

---

## 2. Anforderungen (was „100% richtig" bedeutet)

1. **Durability** — Datei darf NIE verloren gehen (auch nicht bei Disk-/Host-Defekt).
   Industrie-Standard Object-Storage: 99.999999999% (11 Neunen) Haltbarkeit.
2. **Persistenz über Deploys** — Rebuild/Redeploy ändert nichts an Dateien.
3. **Backup + Versionierung** — versehentliches Löschen rückgängig machbar.
4. **Konsistenz DB ↔ Datei** — keine toten Links, keine Waisen-Dateien.
5. **Atomarität** — entweder Datei+DB-Row beide da, oder beide nicht.
6. **CDN-Auslieferung** — schnell weltweit (KZ-Kunden), entlastet Server.
7. **Bezahlbar** — bei Vintage-Shop-Volumen (hunderte–tausende Bilder) ~$0–5/Monat.
8. **Migrierbar** — bestehende Bilder müssen rüber.

---

## 3. Optionen im Vergleich

### Option A — Nur Persistent Volume (aktueller Pfad, minimal)
Coolify Volume `vintage-uploads` → `/app/public/uploads`.
- ✅ Schnell, kein Code-Umbau, kein externer Dienst
- ✅ Löst R1 (Deploy-Verlust)
- ❌ R2–R4 bleiben: ein Disk, kein Backup, kein Redundanz
- ❌ R6 kein CDN
- ❌ Backup muss man selbst bauen (rsync/restic Cron)
- **Verdict:** Pflicht-Minimum, aber NICHT „für immer". Nur als Brücke.

### Option B — S3-kompatibler Object-Storage (EMPFEHLUNG) ⭐
Dateien in Object-Storage, DB speichert die (CDN-)URL.

Kandidaten:

| Anbieter | Storage-Preis | Egress (Traffic) | CDN | KZ-Latenz | Bemerkung |
|----------|--------------|------------------|-----|-----------|-----------|
| **Cloudflare R2** | $0.015/GB/mo | **$0 (gratis!)** | inklusive (global edge) | gut (CF-PoP) | **Beste Wahl**: kein Egress = CDN gratis |
| Backblaze B2 | $0.006/GB/mo | gratis via CF-Bandwidth-Alliance | via CF | mittel | billigster Speicher |
| Supabase Storage | im Plan enthalten | Free: 5GB Egress/mo | inklusive | mittel | **gleiche Plattform wie DB!** |
| Yandex Object Storage | ~$0.02/GB | kostenpflichtig | inklusive | **beste KZ/RU-Latenz** | regional stark |
| AWS S3 | $0.023/GB | $0.09/GB (teuer!) | extra (CloudFront) | mittel | overkill/teuer |

- ✅ 11-Neunen Durability, automatisch redundant
- ✅ Deploy-/Host-unabhängig (R1–R3 gelöst)
- ✅ CDN inklusive (R6)
- ✅ Versionierung/Lifecycle-Backup möglich (R4)
- ✅ Skaliert auf beliebig viele Container (R7)
- ⚠️ Code-Umbau: upload.ts schreibt zu S3 statt Disk; URL-Schema ändert sich
- ⚠️ Migration bestehender Bilder nötig

### Option C — Supabase Storage (Sonderfall von B)
Da die DB **schon auf Supabase** läuft: Storage ist im selben Projekt, ein
Dashboard, S3-kompatibel, CDN inklusive, Backups durch Supabase.
- ✅ Null neue Accounts/Anbieter, gleiche Konsole
- ✅ S3-API ODER `@supabase/supabase-js` Client
- ⚠️ Free-Tier: 1GB Storage + 5GB Egress/Monat (reicht für Start, danach Pro $25/mo)
- ⚠️ Egress kann bei viel Traffic teurer werden als R2 (R2 = 0)

### Option D — Hybrid: Volume + Backup-Sync (Übergang)
Volume als Primär, nightly `restic`/`rclone` Sync nach R2/B2.
- ✅ Wenig Code-Umbau, Backup vorhanden
- ❌ Komplexer Ops (Cron, Restore-Prozess), kein CDN, kein echtes Multi-Instance
- **Verdict:** nur wenn man Object-Storage-Umbau (B) aufschieben will.

---

## 4. EMPFEHLUNG

**Primär: Cloudflare R2** (oder Supabase Storage, wenn „alles an einem Ort"
wichtiger ist als Egress-Kosten).

Begründung für R2:
- **Egress = $0** → CDN-Auslieferung der Fotos kostet nichts, egal wie viel
  Traffic. Bei einem Bilder-lastigen Shop ist Egress sonst der größte Posten.
- 11-Neunen Durability + automatische Redundanz → R1–R4 gelöst.
- S3-API → Standard-SDK (`@aws-sdk/client-s3`), kein Vendor-Lock.
- Custom-Domain möglich: `cdn.galeriedutemps.kz` → professionell + cachebar.
- Bei eurem Volumen praktisch gratis (paar GB).

**Sofort (heute) parallel:** Option A (Volume) als Brücke einschalten, damit
JETZT nichts mehr verloren geht, bis B live ist.

---

## 5. Ziel-Architektur (Option B mit R2)

```
Upload-Flow (atomar):
  1. sharp-Pipeline erzeugt Buffers (Original + thumb/medium/large)  [im RAM]
  2. PUT alle 4 Buffers → R2 (Key: produkte/<uuid>/<variant>.webp)
     → wenn ein PUT fehlschlägt: Abbruch, KEINE DB-Row (kein Waise)
  3. ERST nach erfolgreichem Upload: bildEinfuegen() mit R2-URLs
  → DB-Row zeigt garantiert auf existierende Dateien

URL in DB:  https://cdn.galeriedutemps.kz/produkte/<uuid>/large.webp
Auslieferung: Browser → Cloudflare CDN-Edge → (cache miss) R2

Delete-Flow:
  1. DB-Row löschen (oder soft-delete)
  2. R2-Objekte löschen (best-effort; Orphan-GC räumt Rest)
```

**Konsistenz-/Integritäts-Maßnahmen:**
- **Write-order**: Datei zuerst, DB-Row danach (nie umgekehrt).
- **Orphan-GC** (wöchentlicher Cron): R2-Objekte ohne DB-Referenz → löschen;
  DB-Rows mit 404-URL → markieren/reporten.
- **Health-Check** `/api/health/uploads` erweitern: Stichprobe DB-URLs → HEAD-
  Request → muss 200 sein. Alarm an Admin-Telegram bei toten Links.
- **Backup**: R2 Lifecycle/Versioning aktivieren + Supabase DB-PITR (Point-in-
  Time-Recovery) → beides zusammen = vollständige Wiederherstellung.

---

## 6. Migrations-Plan (bestehende Bilder)

1. R2-Bucket + Custom-Domain + API-Token anlegen.
2. ENV setzen: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET`, `R2_BUCKET`,
   `NEXT_PUBLIC_CDN_URL=https://cdn.galeriedutemps.kz`.
3. `upload.ts` umbauen: statt `writeFile` → S3 `PutObjectCommand`;
   `publicUrlFor` → CDN-URL.
4. **One-time Migrations-Script** `scripts/migrate-images-to-r2.mjs`:
   - Liest alle `produktbilder` + `produkte.hauptbild_url`
   - Lädt jede Datei vom alten Pfad (Volume) → PUT nach R2
   - UPDATE DB-URL auf neue CDN-URL
   - Idempotent (überspringt schon migrierte), mit Fortschritt + Dry-Run
5. Verifikation: Health-Check über alle URLs (alle 200?).
6. Erst danach altes Volume als read-only/Archiv behalten (1 Monat), dann weg.

---

## 7. Aufwand & Reihenfolge

| Schritt | Aufwand | Dringlichkeit |
|---------|---------|---------------|
| **A) Volume jetzt einschalten** (Coolify) | 5 Min (du) | 🔴 SOFORT |
| B1) R2-Bucket + ENV + Custom-Domain | 30 Min (du + ich) | hoch |
| B2) upload.ts → S3 umbauen | ~1–2h (ich) | hoch |
| B3) Migrations-Script + Lauf | ~1h (ich + du) | hoch |
| B4) Orphan-GC-Cron + Health-Check-Alarm | ~1h (ich) | mittel |
| B5) Backup/Versioning aktivieren | 15 Min (du) | mittel |

---

## 8. Offene Entscheidungen (für dich)

1. **R2 vs. Supabase Storage?**
   - R2: günstigster Traffic, eigener Account bei Cloudflare nötig.
   - Supabase: alles an einem Ort, aber Egress-Limit/Kosten höher.
2. **Custom-Domain** `cdn.galeriedutemps.kz` einrichten? (empfohlen, professioneller)
3. **Backup-Tiefe**: nur Versioning, oder zusätzlich tägliche Kopie in 2. Bucket/Region?
