-- ────────────────────────────────────────────────────────────────────────────
-- 049_kontakt_praeferenzen.sql — Kontaktdaten + bevorzugter Kanal
--
-- Damit Kunden (und später Staff) im Mini-App-Profil hinterlegen können, WIE
-- ein Kurator sie am besten zurück erreicht: Telefon, WhatsApp und der
-- bevorzugte Kanal. `telegram_username` + `telefon` existieren bei customers
-- bereits (006 / 026); hier kommen nur die fehlenden Felder dazu.
--
-- kontakt_kanal-Werte (frei, ungezwungen): 'telegram' | 'telefon' | 'whatsapp'
-- | 'email'. Bewusst KEIN CHECK-Constraint — Werte können sich erweitern und
-- ein NULL bedeutet schlicht „keine Präferenz".
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE sebo.customers
  ADD COLUMN IF NOT EXISTS whatsapp      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kontakt_kanal VARCHAR(20);

ALTER TABLE sebo.benutzer
  ADD COLUMN IF NOT EXISTS telefon       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kontakt_kanal VARCHAR(20);

COMMENT ON COLUMN sebo.customers.kontakt_kanal IS
  'Bevorzugter Rückkontakt-Kanal: telegram | telefon | whatsapp | email (NULL = keine Präferenz).';

-- =============================================================================
-- ENDE 049_kontakt_praeferenzen.sql
-- =============================================================================
