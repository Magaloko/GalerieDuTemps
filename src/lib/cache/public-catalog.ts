import { revalidateTag } from "next/cache";

export const PUBLIC_PRODUCTS_TAG = "public-products";
export const PUBLIC_CATEGORIES_TAG = "public-categories";
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300;

export function revalidatePublicCatalogCache() {
  revalidateTag(PUBLIC_PRODUCTS_TAG, { expire: 0 });
  revalidateTag(PUBLIC_CATEGORIES_TAG, { expire: 0 });
}
