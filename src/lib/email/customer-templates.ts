/** E-Mail-Templates für Customer-Auth */

function vintageEmailFrame(content: string, titel: string): string {
  return `
    <!DOCTYPE html><html lang="de"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 26px; text-align: center; margin: 0 0 24px; font-weight: normal;">
          ${titel}
        </h1>
        ${content}
        <hr style="border: none; border-top: 1px solid #E8DFD0; margin: 32px 0;">
        <p style="color: #9B9B9B; font-size: 12px; text-align: center;">
          Galerie du Temps · Handverlesene Vintage-Stücke
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

export function emailBestaetigungMail(vorname: string, url: string): string {
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      vielen Dank für deine Registrierung bei Galerie du Temps!<br>
      Bitte bestätige deine E-Mail-Adresse mit dem folgenden Link:
    </p>
    ${ctaButton("E-Mail bestätigen", url)}
    <p style="color: #8B6F47; font-size: 13px; line-height: 1.6;">
      Der Link ist 48 Stunden gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
    </p>
  `, "E-Mail-Adresse bestätigen");
}

export function passwortResetMail(vorname: string, url: string): string {
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      du hast ein neues Passwort für dein Vintage-Market-Konto angefordert.
      Klicke auf den Button unten, um es zurückzusetzen:
    </p>
    ${ctaButton("Passwort zurücksetzen", url)}
    <p style="color: #8B6F47; font-size: 13px; line-height: 1.6;">
      Der Link ist 2 Stunden gültig. Falls du keine Anfrage gestellt hast, kannst du diese E-Mail ignorieren.
    </p>
  `, "Passwort zurücksetzen");
}

export function b2bWelcomeMail(vorname: string, firma: string): string {
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      dein Antrag als Geschäftskunde für <strong>${firma}</strong> ist bei uns eingegangen.
      Wir prüfen ihn in der Regel innerhalb 1-2 Werktagen und melden uns dann mit deinen
      freigeschalteten Großhandelspreisen.
    </p>
    <p style="color: #8B6F47; line-height: 1.7;">Bis dahin kannst du gerne schon im B2C-Bereich stöbern.</p>
  `, "B2B-Antrag erhalten");
}

export function b2bApprovedMail(vorname: string, couponCode?: string): string {
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      gute Nachrichten — dein B2B-Account wurde freigeschaltet!<br>
      Du siehst ab sofort unsere Großhandelspreise und kannst Rabattstaffeln nutzen.
    </p>
    ${couponCode ? `
    <div style="background: #E8DFD0; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Willkommens-Coupon</p>
      <p style="margin: 8px 0 0; color: #4A2C1A; font-family: monospace; font-size: 20px; letter-spacing: 3px;">${couponCode}</p>
    </div>
    ` : ""}
    ${ctaButton("Zum Katalog", (process.env.NEXTAUTH_URL ?? "") + "/katalog")}
  `, "Willkommen als B2B-Partner");
}

export function b2bRejectMail(vorname: string, grund?: string): string {
  return vintageEmailFrame(`
    <p style="color: #4A2C1A;">Hallo${vorname ? ` ${vorname}` : ""},</p>
    <p style="color: #4A2C1A; line-height: 1.7;">
      leider können wir deinen B2B-Antrag aktuell nicht freischalten.
    </p>
    ${grund ? `<div style="background: #E8DFD0; padding: 16px 20px; margin: 24px 0; color: #4A2C1A;">${grund}</div>` : ""}
    <p style="color: #8B6F47; line-height: 1.7;">
      Du kannst weiterhin als Privatkunde bei uns einkaufen. Bei Fragen stehen wir gerne zur Verfügung.
    </p>
  `, "B2B-Antrag");
}
