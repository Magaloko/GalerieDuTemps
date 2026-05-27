-- =============================================================================
-- vintage-market · Seed-Daten
-- Erster Admin-Benutzer (Passwort: Admin1234! – in Produktion sofort ändern!)
-- Demo-Produkte für Entwicklung
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Admin-Benutzer
-- Passwort: Admin1234!  (bcrypt-Hash, rounds=12)
-- WICHTIG: In Produktion via Script mit sicherem Passwort neu generieren!
-- ---------------------------------------------------------------------------
INSERT INTO sebo.benutzer (email, passwort_hash, name, rolle) VALUES
(
    'admin@galeriedutemps.kz',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaLWbMPLOklwS',
    'Administrator',
    'superadmin'
)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo-Produkte (nur für Entwicklung, in Produktion entfernen)
-- ---------------------------------------------------------------------------
INSERT INTO sebo.produkte
    (name, slug, beschreibung, kurzbeschreibung, preis, originalpreis,
     kategorie_id, zustand, era, herkunft, material, lagerbestand, featured, tags)
VALUES
(
    'Biedermeier Kommode',
    'biedermeier-kommode',
    'Wunderschöne Biedermeier-Kommode aus der ersten Hälfte des 19. Jahrhunderts. Kirschholzfurnier auf Nadelholz. Vier Schubladen mit originalen Messinggriffen. Restauriert und gewachst.',
    'Authentische Biedermeier-Kommode, Kirschholz, ca. 1830',
    2400.00, 2800.00,
    (SELECT id FROM sebo.kategorien WHERE slug = 'moebel'),
    'restauriert', '1830er', 'Deutschland', 'Kirschholz, Nadelholz',
    1, true,
    ARRAY['biedermeier', 'kommode', 'kirschholz', 'antik']
),
(
    'Art Déco Tischlampe',
    'art-deco-tischlampe',
    'Elegante Tischlampe im Art-Déco-Stil, 1920er Jahre. Bronzefuß, original Glasschirm mit geometrischem Muster. Elektrisch neu verdrahtet, sicher verwendbar.',
    'Original Art-Déco Lampe, Bronze & Glas, 1920er',
    380.00, NULL,
    (SELECT id FROM sebo.kategorien WHERE slug = 'beleuchtung'),
    'sehr_gut', '1920er', 'Frankreich', 'Bronze, Opalglas',
    1, true,
    ARRAY['art deco', 'lampe', 'bronze', '1920er']
),
(
    'Meissener Porzellan Vase',
    'meissener-porzellan-vase',
    'Meissener Porzellanvase mit handgemaltem Blumendekor, Schwertermarke vorhanden. Höhe ca. 28 cm. Keine Beschädigungen oder Restaurierungen.',
    'Meissen Vase mit Blumendekor, signiert',
    650.00, NULL,
    (SELECT id FROM sebo.kategorien WHERE slug = 'porzellan'),
    'sehr_gut', '1890er', 'Deutschland (Meissen)', 'Porzellan',
    1, false,
    ARRAY['meissen', 'porzellan', 'vase', 'blumendekor', 'signiert']
)
ON CONFLICT (slug) DO NOTHING;
