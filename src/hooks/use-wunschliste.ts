"use client";

import { useState, useEffect, useCallback } from "react";

interface WunschlisteState {
  ids:         string[];
  isLoading:   boolean;
  toggle:      (produktId: string) => Promise<void>;
  istGemerkt:  (produktId: string) => boolean;
}

/** Cookie-basierter Wunschlisten-Hook – synchronisiert mit /api/wunschliste */
export function useWunschliste(): WunschlisteState {
  const [ids,       setIds]       = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initial laden (einmalig)
  useEffect(() => {
    fetch("/api/wunschliste")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.ids)) setIds(d.ids); })
      .catch(() => {});
  }, []);

  const toggle = useCallback(async (produktId: string) => {
    const istDrin = ids.includes(produktId);
    // Optimistisch updaten
    setIds(prev =>
      istDrin ? prev.filter(id => id !== produktId) : [...prev, produktId]
    );
    setIsLoading(true);
    try {
      const res = await fetch("/api/wunschliste", {
        method:  istDrin ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ produkt_id: produktId }),
      });
      const data = await res.json();
      if (Array.isArray(data.ids)) setIds(data.ids);
    } catch {
      // Rollback bei Fehler
      setIds(prev =>
        istDrin ? [...prev, produktId] : prev.filter(id => id !== produktId)
      );
    } finally {
      setIsLoading(false);
    }
  }, [ids]);

  const istGemerkt = useCallback(
    (produktId: string) => ids.includes(produktId),
    [ids]
  );

  return { ids, isLoading, toggle, istGemerkt };
}
