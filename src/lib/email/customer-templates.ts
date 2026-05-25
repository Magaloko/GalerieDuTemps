/** E-Mail-Шаблоны для Customer-Auth (Russian — Hauptzielgruppe KZ) */

function vintageEmailFrame(content: string, titel: string): string {
  return `
    <!DOCTYPE html><html lang="ru"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 26px; text-align: center; margin: 0 0 24px; font-weight: normal;">
          ${titel}
        </h1>
        ${content}
        <hr style="border: none; border-top: 1px solid #E8DFD0; margin: 32px 0;">
        <p style="color: #9B9B9B; font-size: 12px; text-align: center;">
          Galerie du Temps · Эксклюзивные винтажные вещи
        </p>
      </div>
    </body></html>
  `.trim();
}

function ctaButton(label: string, url: string): string {
  return `<p style="text-align: center; margin: 32px 0;">
    <a href="${url}" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
      ${label}
    </a>
  </p>`;
}

/** Подтверждение e-mail при регистрации */
export function emailBestaetigungMail(vorname: string, url: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">${anrede}</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      Спасибо за регистрацию в Galerie du Temps!<br>
      Пожалуйста, подтвердите свой e-mail, нажав на кнопку ниже:
    </p>
    ${ctaButton("Подтвердить e-mail", url)}
    <p style="color: #8B6F47; font-size: 13px; line-height: 1.6;">
      Ссылка действительна 48 часов. Если вы не регистрировались, просто проигнорируйте это письмо.
    </p>
  `, "Подтверждение e-mail");
}

/** Сброс пароля */
export function passwortResetMail(vorname: string, url: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">${anrede}</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      Вы запросили смену пароля для вашего аккаунта Galerie du Temps.
      Нажмите на кнопку ниже, чтобы установить новый пароль:
    </p>
    ${ctaButton("Сбросить пароль", url)}
    <p style="color: #8B6F47; font-size: 13px; line-height: 1.6;">
      Ссылка действительна 2 часа. Если вы не отправляли запрос, просто проигнорируйте это письмо.
    </p>
  `, "Сброс пароля");
}

/** B2B-Антрag получен */
export function b2bWelcomeMail(vorname: string, firma: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">${anrede}</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      Ваша заявка на B2B-доступ для <strong>${firma}</strong> получена.
      Мы рассмотрим её в течение 1–2 рабочих дней и свяжемся с вами,
      когда оптовые цены будут активированы.
    </p>
    <p style="color: #8B6F47; line-height: 1.7;">
      Пока вы можете покупать по обычным розничным ценам.
    </p>
  `, "Заявка B2B получена");
}

/** B2B-аккаунт одобрен */
export function b2bApprovedMail(vorname: string, couponCode?: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">${anrede}</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      Отличные новости — ваш B2B-аккаунт активирован!<br>
      Теперь вам доступны оптовые цены и скидки за объём.
    </p>
    ${couponCode ? `
    <div style="background: #E8DFD0; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Приветственный промокод</p>
      <p style="margin: 8px 0 0; color: #4A2C1A; font-family: monospace; font-size: 20px; letter-spacing: 3px;">${couponCode}</p>
    </div>
    ` : ""}
    ${ctaButton("В каталог", (process.env.NEXTAUTH_URL ?? "") + "/katalog")}
  `, "Добро пожаловать в B2B");
}

/** B2B-Антrag отклонён */
export function b2bRejectMail(vorname: string, grund?: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">${anrede}</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      К сожалению, мы не можем активировать вашу B2B-заявку в данный момент.
    </p>
    ${grund ? `<div style="background: #E8DFD0; padding: 16px 20px; margin: 24px 0; color: #4A2C1A;">${grund}</div>` : ""}
    <p style="color: #8B6F47; line-height: 1.7;">
      Вы по-прежнему можете покупать у нас как частное лицо. Если у вас есть вопросы — пишите нам.
    </p>
  `, "Заявка B2B");
}
