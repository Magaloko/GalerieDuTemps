-- =============================================================================
-- 035_telegram_pseudo_cleanup.sql
-- =============================================================================
--
-- Bereinigt evtl. existierende „pseudo"-Customers die durch die alte
-- findOrCreateCustomerForTelegramUser-Logik beim Mini-App-Öffnen ohne
-- vorherigen Account angelegt wurden.
--
-- Merkmal: email LIKE 'tg%@telegram.local'
--
-- DRY-RUN ZUERST: vor dem DELETE folgendes ausführen um zu sehen was passieren
-- würde:
--
--   SELECT id, email, telegram_chat_id, telegram_username, erstellt_am,
--          (SELECT COUNT(*) FROM sebo.orders WHERE customer_id = c.id) AS orders_count
--     FROM sebo.customers c
--     WHERE email LIKE 'tg%@telegram.local'
--     ORDER BY erstellt_am DESC;
--
-- Wenn KEINE orders_count > 0: sicher zu deleten.
-- Wenn JA: erst Orders manuell auf einen echten Customer migrieren
--   UPDATE sebo.orders SET customer_id = '<real-uuid>'
--   WHERE customer_id = '<pseudo-uuid>';
--
-- Diese Migration löscht NICHTS automatisch — sie ist ein Marker/Doc.
-- =============================================================================

-- Zähle wieviele Pseudo-Customers existieren (Diagnose).
DO $$
DECLARE
  pseudo_count   INTEGER;
  with_orders    INTEGER;
BEGIN
  SELECT COUNT(*) INTO pseudo_count
    FROM sebo.customers
    WHERE email LIKE 'tg%@telegram.local';

  SELECT COUNT(DISTINCT c.id) INTO with_orders
    FROM sebo.customers c
    JOIN sebo.orders o ON o.customer_id = c.id
    WHERE c.email LIKE 'tg%@telegram.local';

  RAISE NOTICE '[035] Pseudo-Customers gefunden: % (davon mit Orders: %)',
    pseudo_count, with_orders;
  IF pseudo_count > 0 AND with_orders = 0 THEN
    RAISE NOTICE '[035] → SAFE-DELETE möglich. Optional ausführen:';
    RAISE NOTICE '       DELETE FROM sebo.customers WHERE email LIKE ''tg%%@telegram.local'';';
  END IF;
END$$;

-- =============================================================================
-- ENDE 035_telegram_pseudo_cleanup.sql
-- =============================================================================
