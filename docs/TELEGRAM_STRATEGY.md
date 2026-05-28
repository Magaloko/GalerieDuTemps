# Telegram-First Strategy · Galerie du Temps

> Telegram = центральная операционная платформа. Цель: 80% повседневной работы
> магазина (продажа, поддержка, добавление товаров, отчёты) идёт через бот
> или Mini-App, не открывая десктопный admin.

## Vision

**Один Telegram-чат = весь бизнес.**

- **Гость** заходит → видит каталог → лайкает → пишет куратору → оплачивает — всё в Telegram.
- **Клиент** получает push о новых поступлениях + статус заказов.
- **Менеджер** видит push о новом лиде/заказе → отвечает inline.
- **Админ** добавляет новый товар фотографией → AI парсит → admin подтверждает.
- **Владелец** получает ежедневный morning-digest с цифрами.

---

## Что уже готово (база)

- Mini-App с auth (initData verify, role-resolver admin/customer/guest)
- TabBar role-aware: 4 таба под каждую роль
- Magic-link claim для линковки telegram ↔ email
- Wishlist + cart sync (server-side для linked)
- /tg/admin overview + /tg/admin/inbox + /tg/admin/orders (deep-links)
- Bot commands: /start /menu /shop /katalog /kontakt /orders /status /unlink
- Notifications: новый lead → email + telegram-DM админу
- Cart-Drawer-Pipeline + Stripe + Bank + Vor-Ort
- Heart-toggle в каталоге Mini-App
- «Спросить куратора» с produkt-context из Mini-App

---

## Phases (priorities ranked by ROI × effort)

### 🚀 Phase 1 — Customer WOW (in arbeit)
**Цель:** клиент при первом открытии бота сразу видит «это не просто магазин, это галерея».

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1.1 | **Logo / hero photo в welcome message** (sendPhoto) | XS | high |
| 1.2 | Pulse-animation на «Последний экземпляр» | XS | mid |
| 1.3 | **Haptic feedback** на каждом значимом tap | XS | high |
| 1.4 | Confetti на add-to-cart success | S | high |
| 1.5 | Smooth page transitions в Mini-App (view-transitions API) | M | mid |
| 1.6 | Cinematic product gallery (zoom, swipe, fullscreen) | M | high |
| 1.7 | Loading skeleton с vintage-paper-feel | S | mid |
| 1.8 | Push notifications на drop (новый товар каждую среду) | M | high |

**Deliverables:** клиент чувствует premium-experience.

### 🤝 Phase 2 — Customer Loyalty
| # | Feature | Effort | Impact |
|---|---|---|---|
| 2.1 | Personalized recommendations (based on wishlist + browse history) | M | high |
| 2.2 | Re-order from history one-tap | S | mid |
| 2.3 | **Assigned manager** per customer (один менеджер на клиента) | M | high |
| 2.4 | Birthday auto-coupon (cron) | S | mid |
| 2.5 | Stock alerts «Notify me when back» | S | high |
| 2.6 | Price-drop alerts на wishlist | M | mid |
| 2.7 | Loyalty tiers (silver/gold/platinum по сумме покупок) | M | mid |
| 2.8 | VIP customer group-chat (приватный канал) | L | mid |

### 🛠 Phase 3 — Manager Workflow (повседневная операционка)
| # | Feature | Effort | Impact |
|---|---|---|---|
| 3.1 | **Inline reply в /tg/admin/inbox** (без перехода на сайт) | M | critical |
| 3.2 | Quick-action на /tg/admin/orders: «Отправлено + tracking» | S | critical |
| 3.3 | Customer lookup в боте: `/customer +7700...` | S | high |
| 3.4 | Lead assignment к менеджеру inline | M | high |
| 3.5 | B2B-approval inline (1-tap accept/reject) | S | high |
| 3.6 | Morning digest push 9:00: «12 заказов pending, 3 новых leads» | S | high |
| 3.7 | Critical alert: подозрительная оплата / refund request | M | high |
| 3.8 | Stock-low warning push (когда товар < threshold) | S | mid |

### 📸 Phase 4 — Admin Content via Telegram
| # | Feature | Effort | Impact |
|---|---|---|---|
| 4.1 | **Send photo to bot → создаётся черновик товара** | L | very high |
| 4.2 | AI-Extractor подсасывает name/era/material из фото (есть!) | reuse | — |
| 4.3 | Bot спрашивает: цена · категория · состояние via inline-keyboard | M | high |
| 4.4 | Multi-photo product creation (медиа-альбом) | M | high |
| 4.5 | Quick price/stock edit: `/edit GDT-042 price=15000` | S | high |
| 4.6 | Sales dashboard в чате: `/sales today` → 12 заказов, ₸ 850 000 | S | mid |
| 4.7 | Promo trigger: `/promo create SUMMER25 -25%` | M | mid |
| 4.8 | Newsletter draft через bot dialog | L | mid |

### 📊 Phase 5 — Owner Analytics & Insights
| # | Feature | Effort | Impact |
|---|---|---|---|
| 5.1 | Weekly digest Sunday 19:00: цифры + графики (image) | M | high |
| 5.2 | Top-products report `/top week` | S | mid |
| 5.3 | Customer retention metrics | M | mid |
| 5.4 | Marketing campaign ROI | M | mid |
| 5.5 | Realtime revenue alerts (notify при крупных заказах >₸500k) | S | high |

### 🎬 Phase 6 — Advanced
| # | Feature | Effort | Impact |
|---|---|---|---|
| 6.1 | Voice description → AI transcribe + extract → product draft | L | mid |
| 6.2 | Video product showcase в bot (sendVideo) | M | mid |
| 6.3 | Live shopping events (group chat + scheduled drops) | XL | mid |
| 6.4 | Affiliate dashboard для партнёров (свой Mini-App view) | L | mid |
| 6.5 | Multilingual: ru/kz/en switcher в Mini-App | M | low |

---

## Implementation Order Recommendation

**Sprint A (next):** Phase 1 целиком + 3.1+3.6+3.7 (operations critical)
**Sprint B:** Phase 4.1-4.5 (product-via-photo — game changer для скорости)
**Sprint C:** Phase 2.3+2.5 + Phase 5.1 (retention + insights)
**Backlog:** Phase 6 — после stabilization

---

## Technical Constraints / Decisions

- **Mini-App ≠ полная замена** Web-Admin. Сложные таблицы (отчёты, экспорт),
  bulk-edit, медиа-management остаются на десктопе. Mini-App = mobile-first
  daily-operations.
- **Telegram Bot API limits:** 30 messages/sec global, 1/sec/chat. Drop-notifications
  rate-limit пользователей до 1 в день.
- **WebView constraints:** localStorage isolated per surface. Server-side state
  for anything cross-device.
- **AI cost:** product-extractor + voice-transcribe — Anthropic / OpenAI tokens.
  Track usage, add per-admin daily quota.

---

## Success Metrics

- **Week 1:** 50% admin daily actions через Telegram (сейчас 0%)
- **Month 1:** 30% customer purchases через Mini-App (vs web)
- **Month 3:** 70% support-replies из bot inline (без open-web)
- **Month 6:** новый товар добавляется за < 60 секунд (фото → confirm → live)
