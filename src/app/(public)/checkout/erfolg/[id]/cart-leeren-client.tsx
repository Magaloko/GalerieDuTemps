"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

export function CartLeerenClient() {
  const leeren = useCart(s => s.leeren);
  useEffect(() => { leeren(); }, [leeren]);
  return null;
}
