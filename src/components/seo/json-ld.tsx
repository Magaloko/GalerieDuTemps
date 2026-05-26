/* ──────────────────────────────────────────────────────────────────────────
 * JsonLd — Server-Component-friendly wrapper around dangerouslySetInnerHTML.
 *
 * Verwende JsonLd statt eigener <script>-Tags, damit:
 *  - JSON.stringify mit konsistentem Encoding läuft
 *  - Mehrere Schemas in einem Array übergeben werden können (rendert dann
 *    mehrere <script>-Tags, was Google empfiehlt statt @graph-Wrapper)
 * ────────────────────────────────────────────────────────────────────────── */

type JsonLdProps = {
  /** Schema-Objekt ODER Array für mehrere Schemas auf einer Seite. */
  data: object | object[];
  /** Optional: stable id für React (verhindert duplicates wenn multiple JsonLd-Komponenten). */
  id?: string;
};

export function JsonLd({ data, id }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={id ? `${id}-${i}` : i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
