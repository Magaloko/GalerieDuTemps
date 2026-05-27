-- ────────────────────────────────────────────────────────────────────────────
-- 031_hero_background.sql — konfigurierbarer Hero-Hintergrund
--
-- Bisher waren Hero-Bilder hardcoded (5 Stack-Bilder in /images/).
-- Jetzt: ein einzelnes Hintergrund-Bild ODER Video, vom Admin via
-- /admin/einstellungen/marketing setzbar.
--
-- Format-Erkennung im Frontend:
--   .mp4 / .webm / .mov  → <video> autoplay muted loop
--   sonst                → <Image>
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, beschreibung, fallback) VALUES

('home.hero.background_url',
 '{"ru":"/images/hero-stack-1.jpg","en":"/images/hero-stack-1.jpg","de":"/images/hero-stack-1.jpg"}'::jsonb,
 'Startseite → Hero → Hintergrund. Bild-URL (jpg/png/webp) ODER Video-URL (.mp4/.webm). Wenn leer: erstes Hero-Stack-Bild als Fallback.',
 '/images/hero-stack-1.jpg'),

('home.hero.background_poster',
 '{"ru":"","en":"","de":""}'::jsonb,
 'Optional: Poster-Bild wenn background_url ein Video ist. Wird vor dem Video-Load angezeigt + im LCP-Test.',
 '')

ON CONFLICT (schluessel) DO NOTHING;
