-- =============================================================================
-- 040_kaufen_flag.sql — Feature-Flag „kaufen_aktiv" auf FALSE seeden
-- =============================================================================
--
-- Schaltet den Shop in den Schaufenster-/Anfrage-Modus:
--   kaufen_aktiv = false  → keine Korzina/Bezahlung, nur „Запросить",
--                            Verfügbarkeit als „есть/нет" (ohne Stückzahl)
--   kaufen_aktiv = true   → normaler Shop (Admin kann jederzeit umschalten)
--
-- Neue Flags defaulten im Code auf true → wir setzen hier explizit false,
-- damit der Schaufenster-Modus direkt nach Deploy aktiv ist.
-- =============================================================================

INSERT INTO sebo.feature_flags (schluessel, aktiviert, beschreibung)
VALUES ('kaufen_aktiv', false,
        'ВКЛ = магазин (корзина/оплата). ВЫКЛ = витрина: только запрос, наличие есть/нет.')
ON CONFLICT (schluessel) DO NOTHING;

-- =============================================================================
-- ENDE 040_kaufen_flag.sql
-- =============================================================================
