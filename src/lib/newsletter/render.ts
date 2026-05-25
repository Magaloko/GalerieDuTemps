/**
 * Newsletter-Block-Renderer
 * Erzeugt aus dem JSONB-Block-Array HTML für E-Mail (inline-styles für Kompatibilität)
 */

import type { NewsletterBlock } from "@/types/newsletter";

export interface RenderContext {
  unsubscribe_url: string;
  vorname?:        string;
  basis_url:       string;
}

const COLORS = {
  cream:    "#F5F0E8",
  parchment:"#E8DFD0",
  sand:     "#C9B89A",
  brown:    "#8B6F47",
  espresso: "#4A2C1A",
  gold:     "#C9A84C",
  dust:     "#9B9B9B",
};

function fontFamily(serif = false): string {
  return serif ? '"Playfair Display", Georgia, serif' : '"Inter", system-ui, sans-serif';
}

function renderBlock(block: NewsletterBlock, ctx: RenderContext): string {
  switch (block.type) {
    case "hero":
      return `
        <tr><td style="padding: 0; background: ${COLORS.espresso};">
          ${block.bild_url ? `<img src="${block.bild_url}" alt="" style="display:block; width:100%; max-width:600px; height:auto;" />` : ""}
          <div style="padding: 40px 30px; text-align: center;">
            ${block.titel ? `<h1 style="font-family: ${fontFamily(true)}; color: ${COLORS.cream}; font-size: 30px; margin: 0 0 12px; font-weight: normal;">${block.titel}</h1>` : ""}
            ${block.subtitel ? `<p style="font-family: ${fontFamily()}; color: ${COLORS.gold}; font-size: 14px; margin: 0 0 24px;">${block.subtitel}</p>` : ""}
            ${block.cta_label && block.cta_url ? `
              <a href="${block.cta_url}" style="display: inline-block; padding: 14px 32px; background: ${COLORS.gold}; color: ${COLORS.espresso}; text-decoration: none; font-family: ${fontFamily()}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
                ${block.cta_label}
              </a>
            ` : ""}
          </div>
        </td></tr>`;

    case "text":
      return `
        <tr><td style="padding: 32px 30px; background: #FDFAF5;">
          <div style="font-family: ${fontFamily()}; color: ${COLORS.espresso}; font-size: 15px; line-height: 1.7;">
            ${block.html ?? ""}
          </div>
        </td></tr>`;

    case "button":
      return `
        <tr><td style="padding: 20px 30px; background: #FDFAF5; text-align: center;">
          <a href="${block.url ?? "#"}" style="display: inline-block; padding: 14px 32px; background: ${COLORS.espresso}; color: ${COLORS.cream}; text-decoration: none; font-family: ${fontFamily()}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            ${block.label ?? "Mehr erfahren"}
          </a>
        </td></tr>`;

    case "divider":
      return `
        <tr><td style="padding: 16px 30px; background: #FDFAF5;">
          <hr style="border: none; border-top: 1px solid ${COLORS.sand}; margin: 0;">
        </td></tr>`;

    case "image":
      return `
        <tr><td style="padding: 0; background: #FDFAF5;">
          <img src="${block.bild_url ?? ""}" alt="${block.titel ?? ""}" style="display:block; width:100%; max-width:600px; height:auto;" />
        </td></tr>`;

    case "two_columns":
      return `
        <tr><td style="padding: 24px 30px; background: #FDFAF5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td valign="top" style="width: 48%; padding-right: 4%; font-family: ${fontFamily()}; color: ${COLORS.espresso}; font-size: 14px;">
                ${block.links_html ?? ""}
              </td>
              <td valign="top" style="width: 48%; font-family: ${fontFamily()}; color: ${COLORS.espresso}; font-size: 14px;">
                ${block.rechts_html ?? ""}
              </td>
            </tr>
          </table>
        </td></tr>`;

    case "produkt":
      return `
        <tr><td style="padding: 24px 30px; background: #FDFAF5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.sand};">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0; font-family: ${fontFamily(true)}; color: ${COLORS.espresso}; font-size: 18px;">${block.titel ?? "Produkt"}</p>
                ${block.subtitel ? `<p style="margin: 4px 0 12px; color: ${COLORS.dust}; font-size: 13px;">${block.subtitel}</p>` : ""}
                <a href="${ctx.basis_url}/katalog/${block.produkt_slug ?? ""}" style="color: ${COLORS.gold}; font-family: ${fontFamily()}; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 2px;">
                  Ansehen →
                </a>
              </td>
            </tr>
          </table>
        </td></tr>`;

    default:
      return "";
  }
}

export function renderNewsletter(blocks: NewsletterBlock[], ctx: RenderContext): string {
  const body = blocks.map(b => renderBlock(b, ctx)).join("\n");
  const baseUrl = ctx.basis_url;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background: ${COLORS.cream}; font-family: ${fontFamily()};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${COLORS.cream};">
    <tr><td align="center" style="padding: 24px 0;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
        ${body}
        <tr>
          <td style="padding: 32px 30px; background: ${COLORS.parchment}; text-align: center; font-family: ${fontFamily()}; font-size: 11px; color: ${COLORS.dust};">
            <p style="margin: 0 0 8px;">Galerie du Temps · Handverlesene Stücke mit Geschichte</p>
            <p style="margin: 0;">
              <a href="${baseUrl}" style="color: ${COLORS.brown}; text-decoration: none;">Zur Website</a>
              ·
              <a href="${ctx.unsubscribe_url}" style="color: ${COLORS.brown}; text-decoration: none;">Abmelden</a>
              ·
              <a href="${baseUrl}/impressum" style="color: ${COLORS.brown}; text-decoration: none;">Impressum</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
