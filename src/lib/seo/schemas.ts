/* ──────────────────────────────────────────────────────────────────────────
 * JSON-LD Schema Generators
 *
 * Erzeugt schema.org-konforme JSON-LD-Objekte (kein <script>-Tag — der wird
 * von der <JsonLd>-Komponente um das Objekt gewrapped, damit Next.js mit
 * dangerouslySetInnerHTML keine Hydration-Warnungen wirft).
 *
 * Quellen-of-Truth:
 *  - https://schema.org/Store, /Product, /Offer, /BreadcrumbList
 *  - Google Merchant Center Product-Spezifikation (für Shopping-Eligibility)
 * ────────────────────────────────────────────────────────────────────────── */

type Currency = "KZT" | "EUR" | "USD" | "RUB";

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "https://galeriedutemps.kz"
  );
}

/** Organization / Store — Layout-Level. */
export function storeSchema(opts: {
  address?:  { street?: string; postalCode?: string; locality?: string; country?: string };
  email?:    string;
  telephone?: string;
  sameAs?:    string[];
}) {
  const url = getSiteUrl();
  const a   = opts.address ?? {};
  const hasAddress = Boolean(a.street || a.locality);
  return {
    "@context": "https://schema.org",
    "@type":    "Store",
    "@id":      `${url}/#store`,
    name:        "Galerie du Temps",
    url,
    logo:        `${url}/opengraph-image`,
    image:       `${url}/opengraph-image`,
    description: "Кураторская галерея винтажа в Алматы — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию.",
    priceRange:  "₸₸₸",
    ...(opts.email && { email: opts.email }),
    ...(opts.telephone && { telephone: opts.telephone }),
    ...(opts.sameAs && opts.sameAs.length > 0 && { sameAs: opts.sameAs }),
    ...(hasAddress && {
      address: {
        "@type":          "PostalAddress",
        ...(a.street      && { streetAddress:    a.street }),
        ...(a.postalCode  && { postalCode:       a.postalCode }),
        ...(a.locality    && { addressLocality:  a.locality }),
        addressCountry:                          a.country ?? "KZ",
      },
    }),
  };
}

/** Product — pro Produkt-Detail-Seite. */
export function productSchema(opts: {
  id:          number | string;
  slug:        string;
  name:        string;
  description?: string;
  images:      string[];
  price:       number;
  currency:    Currency;
  inStock:     boolean;
  condition?:  "new" | "used" | "refurbished";
  brand?:      string;
  sku?:        string;
  category?:   string;
}) {
  const url = getSiteUrl();
  const productUrl = `${url}/katalog/${opts.slug}`;
  const conditionMap = {
    new:         "https://schema.org/NewCondition",
    used:        "https://schema.org/UsedCondition",
    refurbished: "https://schema.org/RefurbishedCondition",
  } as const;
  const absImages = opts.images
    .filter(Boolean)
    .map(img => img.startsWith("http") ? img : `${url}${img.startsWith("/") ? "" : "/"}${img}`);

  return {
    "@context":   "https://schema.org",
    "@type":      "Product",
    "@id":        `${productUrl}#product`,
    name:          opts.name,
    ...(opts.description && { description: opts.description }),
    ...(absImages.length > 0 && { image: absImages }),
    sku:           opts.sku ?? String(opts.id),
    ...(opts.category && { category: opts.category }),
    brand: {
      "@type": "Brand",
      name:    opts.brand ?? "Galerie du Temps",
    },
    offers: {
      "@type":         "Offer",
      url:             productUrl,
      priceCurrency:   opts.currency,
      price:           opts.price.toFixed(2),
      availability:    opts.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition:   conditionMap[opts.condition ?? "used"],
      seller: { "@type": "Organization", name: "Galerie du Temps" },
    },
  };
}

/** BreadcrumbList — Katalog / Produkt-Detail / Kategorie-Listen. */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  const base = getSiteUrl();
  return {
    "@context":       "https://schema.org",
    "@type":          "BreadcrumbList",
    itemListElement:  items.map((it, i) => ({
      "@type":   "ListItem",
      position:  i + 1,
      name:      it.name,
      item:      it.url.startsWith("http") ? it.url : `${base}${it.url}`,
    })),
  };
}

/** WebSite + SearchAction — ermöglicht Google Sitelinks-Suchfeld. */
export function websiteSchema() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    "@id":      `${url}/#website`,
    url,
    name:        "Galerie du Temps",
    inLanguage:  ["ru-RU", "en-US", "de-DE"],
    potentialAction: {
      "@type":       "SearchAction",
      target: {
        "@type":      "EntryPoint",
        urlTemplate:  `${url}/katalog?suche={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
