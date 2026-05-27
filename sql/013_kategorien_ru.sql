-- ---------------------------------------------------------------------------
-- Migration 012: Standard-Kategorien auf Russisch übersetzen
-- Slugs bleiben unverändert (URL-Identifier).
-- ---------------------------------------------------------------------------

UPDATE sebo.kategorien SET
    name = 'Мебель',
    beschreibung = 'Винтажная мебель всех эпох'
WHERE slug = 'moebel';

UPDATE sebo.kategorien SET
    name = 'Декор',
    beschreibung = 'Декоративные предметы и украшения'
WHERE slug = 'deko';

UPDATE sebo.kategorien SET
    name = 'Фарфор',
    beschreibung = 'Посуда, фигурки и вазы'
WHERE slug = 'porzellan';

UPDATE sebo.kategorien SET
    name = 'Освещение',
    beschreibung = 'Лампы, светильники и люстры'
WHERE slug = 'beleuchtung';

UPDATE sebo.kategorien SET
    name = 'Текстиль',
    beschreibung = 'Ткани, ковры и вышивка'
WHERE slug = 'textilien';

UPDATE sebo.kategorien SET
    name = 'Украшения',
    beschreibung = 'Винтажные украшения и аксессуары'
WHERE slug = 'schmuck';

UPDATE sebo.kategorien SET
    name = 'Искусство',
    beschreibung = 'Картины, графика и скульптуры'
WHERE slug = 'kunst';

UPDATE sebo.kategorien SET
    name = 'Кухня',
    beschreibung = 'Винтажная кухонная утварь'
WHERE slug = 'kueche';
