/**
 * E-Mail-Шаблоны для партнёрской программы (Russian)
 */

import { formatPreis } from "@/lib/utils/preis";

export function neueProvisionMail(opts: {
  vorname:        string;
  betragCent:     number;
  ebene:          1 | 2 | 3;
  produktName?:   string | null;
  verkaufspreisCent: number;
}): string {
  const ebeneText = opts.ebene === 1
    ? "Прямая комиссия"
    : opts.ebene === 2
      ? "Комиссия за привлечённого партнёра (уровень 2)"
      : "Комиссия 3-го уровня";

  const anrede = opts.vorname ? `Здравствуйте, ${opts.vorname}!` : "Здравствуйте!";

  return `
    <!DOCTYPE html>
    <html lang="ru">
    <body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 28px; text-align: center; margin: 0 0 16px; font-weight: normal;">
          Новая комиссия начислена!
        </h1>
        <p style="color: #4A2C1A; line-height: 1.7;">
          ${anrede}<br><br>
          Вашему партнёрскому аккаунту начислена новая комиссия:
        </p>

        <div style="background: #4A2C1A; color: #FDFAF5; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0; color: #C9A84C; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">${ebeneText}</p>
          <p style="margin: 12px 0 0; font-size: 36px; color: #C9A84C;">${formatPreis(opts.betragCent / 100)}</p>
        </div>

        <table style="width: 100%; font-size: 14px; color: #8B6F47; border-collapse: collapse;">
          ${opts.produktName ? `<tr><td style="padding: 6px 0;">Товар:</td><td style="text-align: right; color: #4A2C1A;"><strong>${opts.produktName}</strong></td></tr>` : ""}
          <tr><td style="padding: 6px 0;">Сумма продажи:</td><td style="text-align: right; color: #4A2C1A;"><strong>${formatPreis(opts.verkaufspreisCent / 100)}</strong></td></tr>
          <tr><td style="padding: 6px 0;">Статус:</td><td style="text-align: right;"><span style="background: #C9A84C; color: #4A2C1A; padding: 2px 8px; font-size: 11px; letter-spacing: 1px;">ОЖИДАЕТ</span></td></tr>
        </table>

        <p style="color: #8B6F47; line-height: 1.7; font-size: 13px; margin-top: 24px;">
          После 14-дневного периода возврата комиссия будет подтверждена
          и при достижении минимальной суммы выплачена.
        </p>

        <p style="text-align: center; margin: 32px 0;">
          <a href="https://galeriedutemps.kz/affiliate" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            Открыть кабинет
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #E8DFD0; margin: 32px 0;">
        <p style="color: #9B9B9B; font-size: 12px; text-align: center;">
          Galerie du Temps · Партнёрская программа
        </p>
      </div>
    </body>
    </html>
  `.trim();
}

export function provisionStorniertMail(opts: {
  vorname:    string;
  betragCent: number;
  grund:      string;
}): string {
  const anrede = opts.vorname ? `Здравствуйте, ${opts.vorname}!` : "Здравствуйте!";
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #722F37; font-size: 20px; text-align: center; margin: 0 0 8px;">!</p>
        <h1 style="color: #4A2C1A; font-size: 24px; text-align: center; margin: 0 0 16px; font-weight: normal;">
          Комиссия отменена
        </h1>
        <p style="color: #4A2C1A; line-height: 1.7;">
          ${anrede}<br><br>
          К сожалению, комиссия в размере <strong>${formatPreis(opts.betragCent / 100)}</strong>
          должна быть отменена.
        </p>
        <div style="background: #E8DFD0; border-left: 3px solid #722F37; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Причина</p>
          <p style="margin: 8px 0 0; color: #4A2C1A;">${opts.grund}</p>
        </div>
        <p style="color: #8B6F47; line-height: 1.7;">
          Если у вас возникли вопросы — пишите нам.<br><br>
          <strong style="color: #4A2C1A;">Команда Galerie du Temps</strong>
        </p>
      </div>
    </body>
    </html>
  `.trim();
}
