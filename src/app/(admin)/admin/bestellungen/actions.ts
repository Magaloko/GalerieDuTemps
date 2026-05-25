"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  orderStatusUpdate,
  orderNotizenAktualisieren,
  orderTrackingAktualisieren,
  orderCanceln,
} from "@/lib/db/orders";
import type { OrderStatus } from "@/types/commerce";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const STATI: OrderStatus[] = ["pending", "paid", "fulfilled", "completed", "cancelled", "refunded"];

export async function statusAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const status = formData.get("status") as OrderStatus;
  if (!STATI.includes(status)) return { ok: false, error: "Ungültiger Status" };

  await orderStatusUpdate(orderId, status, {
    bezahlt: status === "paid",
  });
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Status обновлён." };
}

export async function notizenAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const interne = (formData.get("interne_notiz") as string) || null;
  const kunden  = (formData.get("kunden_notiz")  as string) || null;

  await orderNotizenAktualisieren(orderId, interne, kunden);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true, message: "Заметки сохранены." };
}

export async function trackingAktualisierenAction(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Не авторизовано" };

  const nummer = (formData.get("tracking_nummer") as string) || null;
  const url    = (formData.get("tracking_url")    as string) || null;

  await orderTrackingAktualisieren(orderId, nummer, url);
  revalidatePath(`/admin/bestellungen/${orderId}`);
  return { ok: true, message: "Tracking gespeichert." };
}

export async function bestellungStornierenAction(
  orderId: string,
  grund: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Не авторизовано" };

  await orderCanceln(orderId, grund || "Storno durch Admin");
  revalidatePath(`/admin/bestellungen/${orderId}`);
  revalidatePath("/admin/bestellungen");
  return { ok: true, message: "Заказ отменён." };
}
