# Stephan — Onboarding · Galerie du Temps

Willkommen im Team. Diese Seite ist deine 5-Minuten-Einführung. Lesen, dann Login holen, dann loslegen.

## Was Galerie du Temps ist

Online-Marktplatz für kuratierte Vintage-Schätze in Kasachstan. Zielgruppe: Sammler, Innenarchitekten, Geschenkesuchende. Sprache primär Russisch (Admin-Backend zweisprachig DE/RU).

Domains:
- **Live:** https://galerie.apps.dadakaev.tech (später galeriedutemps.kz)
- **Admin:** https://galerie.apps.dadakaev.tech/admin
- **GitHub:** https://github.com/Magaloko/GalerieDuTemps

## Dein Login

- Mo legt dir einen Admin-Account an unter `/admin/einstellungen/benutzer`
- Du bekommst per E-Mail dein temporäres Passwort
- **Ändere es sofort nach erstem Login** (Profil-Einstellungen)
- Rolle: `admin` (nicht `superadmin` — du kannst keine User verwalten, das ist Absicht)

## Dein täglicher Workflow

### 1. Inbox prüfen (`/admin/leads`)
Hier sammeln sich alle eingehenden Anfragen aus:
- Kontaktformular auf der Website
- (bald) Instagram-DMs/Kommentare
- (bald) Telegram-Bot

**Was tun mit neuen Leads:**
- Lesen → Status `Gelesen`
- Wenn Antwort nötig → Status `In Arbeit` + dich selbst zuweisen
- Antwort schreiben (per E-Mail/IG/etc.) → im Lead-Detail dokumentieren: „Versendete Antwort"
- Wenn fertig → Status `Beantwortet`
- Spam/Irrelevant → Status `Archiviert`
- Echter Interessent? → Button „Als Customer anlegen" → er landet in der CRM-Pipeline

**Filter „Только мои" oben rechts** zeigt nur Leads, die dir zugewiesen sind.

### 2. CRM-Pipeline pflegen (`/admin/crm/pipeline`)
Customers wandern von links nach rechts durch Stages: Lead → Qualifiziert → Kunde → VIP / Inaktiv. Drag-and-Drop. Nach Bedarf Tags vergeben (z.B. „möbel-interesse", „art-deco").

### 3. Tasks abarbeiten (`/admin/crm/tasks`)
Was du selbst erstellst (z.B. „Stephan: Käufer X in 3 Tagen nachfragen") oder was Mo dir zuweist. „Только мои"-Filter ist dein Freund.

## Was du tun darfst

- ✅ Produkte ansehen, ihre Beschreibungen bearbeiten, Bilder ergänzen
- ✅ Inbox bearbeiten (Status, Antworten dokumentieren, Customer-Konvertierung)
- ✅ Tasks erstellen, dir selbst oder Mo zuweisen
- ✅ Pipeline-Stages für Customers ändern
- ✅ Newsletter-Inhalte vorbereiten (Versand macht Mo)

## Was du NICHT tun sollst (ohne Rücksprache mit Mo)

- ❌ Produkte LÖSCHEN (lieber „Inaktiv" setzen)
- ❌ Preise ändern bei existierenden Produkten
- ❌ Bestellungen stornieren oder refunden
- ❌ Stripe/Kaspi-Einstellungen
- ❌ Coolify/Server/DB direkt anfassen
- ❌ User anlegen oder Rollen vergeben (geht eh nicht ohne superadmin)

## Quick-Cheatsheet — Wichtigste Pfade

| Was | Wo |
|---|---|
| Eigene Aufgaben | `/admin/leads?meine=1` · `/admin/crm/tasks` |
| Neues Produkt schnell mit KI | `/admin/produkte/schnell` |
| Kontaktanfragen | `/admin/leads?quelle=kontaktanfrage` |
| Kunden-Liste | `/admin/kunden` |
| CRM-Pipeline | `/admin/crm/pipeline` |
| Statistiken | `/admin/statistiken` |

## Wenn du nicht weiterkommst

1. Slack/Telegram an Mo (er ist meist binnen 1-2 Stunden zurück)
2. Bei dringenden Bugs: **kein eigenmächtiger Workaround**, lieber kurz fragen
3. Wenn die Seite Down ist: Coolify-Restart kann nur Mo

## Branding-Regeln (wichtig für Antworten an Kunden)

- Anrede russisch: „Здравствуйте, [Name]!"
- Tonalität: elegant, kuratiert, kein Hard-Sell. Wie ein Galerist im persönlichen Gespräch.
- Verabschiedung: „С теплом, Galerie du Temps"
- Bei Bestellanfragen IMMER: Preis, Verfügbarkeit, Versandoption (Алматы Abholung vs. KZ-Versand vs. International)
- Auf Russisch antworten, außer der Kunde schreibt explizit EN/DE/KZ
- Bei Großhandel-Anfragen (B2B): direkt an Mo eskalieren

## Glossar

- **Lead** — eingehende Anfrage (Mail/IG/etc), noch unklar ob's ein Kunde wird
- **Customer** — registrierter oder von uns angelegter Kontakt mit E-Mail im System
- **Order** — bezahlte Bestellung
- **Pipeline-Stage** — wo der Customer im Verkaufstrichter steht (Lead → VIP)
- **B2C / B2B** — Endkunde vs. Geschäftskunde (B2B sieht andere Preise nach Verifizierung)
- **Featured** — Produkt auf der Homepage hervorgehoben
- **Aktiv / Inaktiv** — Master-Switch ob ein Produkt im Shop sichtbar ist

## Was im Sommer passieren soll

Mo's Vision für deinen Monat:
1. **Inbox-Hygiene**: alle alten Kontaktanfragen aufarbeiten, sauber kategorisieren
2. **Produkte vervollständigen**: Beschreibungen schöner machen, Tags ergänzen, Maße eintragen
3. **Instagram-Pipeline beobachten** sobald angeschlossen — sehen welche Anfragen reinkommen
4. **Eigene Verbesserungsvorschläge** sammeln (Workflow, UI) — am Monatsende Review-Meeting

Viel Spaß. Frag wenn was unklar ist — keine dumme Frage in Woche 1.
