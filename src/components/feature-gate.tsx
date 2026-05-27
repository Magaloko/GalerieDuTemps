import { isFeatureEnabled, type FeatureKey } from "@/lib/db/feature-flags";

/**
 * Server-Komponente: Rendert children nur wenn Feature aktiv.
 *
 * Verwendung in Layouts oder Pages:
 *
 *   <FeatureGate feature="ki_assistent">
 *     <ChatWidget />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="wunschliste" fallback={<DeaktiviertHinweis />}>
 *     <WishlistButton />
 *   </FeatureGate>
 *
 * Hinweis: Eine async Server-Komponente — kann NICHT direkt in Client-
 * Komponenten verwendet werden. Aus Client-Code: stattdessen die Flag-API
 * via Server-Action ziehen oder das Element auf Server-Seite ausblenden.
 */
export async function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature:   FeatureKey;
  children:  React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = await isFeatureEnabled(feature);
  return <>{enabled ? children : fallback}</>;
}
