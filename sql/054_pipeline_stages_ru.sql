-- ---------------------------------------------------------------------------
-- 054_pipeline_stages_ru.sql
-- ---------------------------------------------------------------------------
-- Die Standard-Pipeline-Stages wurden in 008_crm.sql mit DEUTSCHEN Namen
-- geseedet (Lead / Qualifiziert / Kunde / VIP / Inaktiv). Die gesamte
-- Galerie-Oberfläche ist russisch — daher die Stages auf Russisch umbenennen.
--
-- Idempotent: matcht exakt die alten deutschen Namen. Wurde eine Stage bereits
-- umbenannt (oder vom Admin angepasst), wird sie nicht angefasst.
-- ---------------------------------------------------------------------------

UPDATE sebo.pipeline_stages SET name = 'Лид'           WHERE name = 'Lead';
UPDATE sebo.pipeline_stages SET name = 'Квалифицирован' WHERE name = 'Qualifiziert';
UPDATE sebo.pipeline_stages SET name = 'Клиент'         WHERE name = 'Kunde';
UPDATE sebo.pipeline_stages SET name = 'Неактивный'     WHERE name = 'Inaktiv';
-- 'VIP' bleibt unverändert (sprachneutral).
