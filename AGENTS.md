<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Production / Coolify Deployment

### Persistent Volume für Upload-Bilder

Produkt-Bilder werden serverseitig im Filesystem gespeichert. Ohne Persistent
Volume gehen **alle Bilder bei jedem Container-Rebuild verloren**.

**Coolify-Konfiguration:**

In der App in Coolify → **Storage** → **Add Persistent Volume**:
- **Source name:** `vintage-uploads`
- **Destination path:** `/app/public/uploads`

Oder alternativ mit Environment-Variable:
- ENV setzen: `UPLOAD_DIR=/data/uploads`
- Volume mounten: `vintage-uploads` → `/data/uploads`

Nach dem Mount: App neu deployen. Files die vor dem Mount geschrieben wurden
sind verloren — Re-Upload aller Produktbilder notwendig.

**Diagnose:** Status prüfen via `GET /api/health/uploads` — gibt JSON mit
aufgelöstem UPLOAD_DIR, Existenz-Check und File-Count zurück.

### Weitere kritische ENV-Variablen

```
DATABASE_URL              # Postgres connection
NEXTAUTH_URL              # Site-URL (für Auth-Callbacks)
NEXT_PUBLIC_SITE_URL      # Site-URL (für metadataBase, Schema, Canonical)
NEXTAUTH_SECRET           # Auth-Session-Secret
UPLOAD_DIR                # Optional, default /app/public/uploads
STRIPE_SECRET_KEY         # Falls Stripe-Zahlung
BREVO_API_KEY             # Falls Brevo für Newsletter/Transaktional
EMERGENCY_SHOP_DISABLE    # Notfall: "true" → erzwingt sofort Schaufenster-Modus
                          #   (kaufen_aktiv=false, fail-closed) ohne Deploy/DB-Write.
                          #   Sperrt alle Kaufpfade serverseitig + kippt die UI in
                          #   den Vitrinen-Zustand. Wieder entfernen = Normalbetrieb.
```
