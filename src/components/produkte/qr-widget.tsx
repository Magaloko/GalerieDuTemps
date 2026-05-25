import QRCode from "qrcode";
import { QrCode, Download } from "lucide-react";

interface Props {
  slug: string;
}

/**
 * Server-Component: generiert SVG-QR-Code statisch.
 * Verlinkt auf die öffentliche Produktdetail-Seite.
 */
export async function QrWidget({ slug }: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url     = `${baseUrl.replace(/\/$/, "")}/katalog/${slug}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#1A120B", light: "#FAF5E9" },
    width: 200,
  });

  // Data-URL für Download
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return (
    <section
      className="bg-vintage-white border border-vintage-sand p-5 space-y-3"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <h3 className="font-serif text-base text-vintage-espresso flex items-center gap-2">
        <QrCode className="w-4 h-4 text-vintage-gold" /> QR-Code
      </h3>
      <div
        className="flex justify-center p-3 bg-vintage-parchment"
        style={{ borderRadius: "var(--radius-vintage)" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-xs text-vintage-dust font-sans text-center break-all">
        {url}
      </p>
      <a
        href={dataUrl}
        download={`qr-${slug}.svg`}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
        style={{ borderRadius: "var(--radius-button)" }}
      >
        <Download className="w-3 h-3" /> SVG herunterladen
      </a>
    </section>
  );
}
