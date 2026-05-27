-- ---------------------------------------------------------------------------
-- Migration 022: Wechselkurse für Multi-Currency-Pricing
--
-- Basiswährung ist KZT. Alle Kurse ausgedrückt als: 1 <FOREIGN> = X KZT.
-- Initiale Werte sind ungefähre Mai-2026-Kurse — sollten via Cron-Job
-- regelmäßig von NBK/exchangerate-API aktualisiert werden (Phase später).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sebo.wechselkurse (
    waehrung      CHAR(3)      PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL,
    symbol        VARCHAR(8)   NOT NULL,
    rate_to_kzt   NUMERIC(14,6) NOT NULL,   -- 1 waehrung = rate_to_kzt KZT
    quelle        VARCHAR(50),               -- 'manuell' | 'nbk' | 'ecb' | …
    aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sebo.wechselkurse (waehrung, name, symbol, rate_to_kzt, quelle) VALUES
    ('KZT', 'Тенге',          '₸',  1.000000,   'system'),
    ('EUR', 'Евро',            '€',  540.000000, 'manuell'),
    ('USD', 'Доллар США',      '$',  500.000000, 'manuell'),
    ('RUB', 'Российский рубль','₽',  5.500000,   'manuell')
ON CONFLICT (waehrung) DO NOTHING;

COMMENT ON TABLE sebo.wechselkurse IS
    'Multi-Currency-Konvertierung. Basis KZT. Update via /admin/einstellungen/wechselkurse oder Cron (NBK API).';
