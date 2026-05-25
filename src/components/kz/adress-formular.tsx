"use client";

/**
 * Kasachstan-spezifisches Adress-Formular
 * Felder: Vorname/Nachname, Straße+Hausnr., Wohnung (optional),
 *         Stadt, Oblast (Dropdown), Index (6-stellig), Telefon (+7)
 */

import { useState } from "react";
import { Input }  from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OBLASTS, type Oblast } from "@/lib/kz/oblasts";
import { formatTelefon, istValiderIndex, istValideTelefon } from "@/lib/kz/validate";

export interface KzAdresse {
  vorname:    string;
  nachname:   string;
  strasse:    string;
  wohnung?:   string;
  stadt:      string;
  oblast:     string;        // code
  index:      string;
  telefon:    string;
  land:       string;        // default "KZ"
}

interface Props {
  initial?:  Partial<KzAdresse>;
  prefix?:   string;        // für Name-Attribute: "billing." oder "shipping."
  sprache?:  "ru" | "kz" | "en";
}

export function AdressFormular({ initial, prefix = "", sprache = "ru" }: Props) {
  const [telefon,  setTelefon]  = useState(initial?.telefon ?? "");
  const [index,    setIndex]    = useState(initial?.index ?? "");

  const oblastLabel = (o: Oblast) =>
    sprache === "kz" ? o.name_kz : sprache === "en" ? o.name_en : o.name_ru;

  const labels = sprache === "kz" ? {
    vorname: "Аты", nachname: "Тегі", strasse: "Көше", wohnung: "Пәтер",
    stadt: "Қала", oblast: "Облыс", index: "Пошта индексі", telefon: "Телефон",
    indexHint: "6 сан", telefonHint: "+7 7XX XXX XX XX",
  } : sprache === "en" ? {
    vorname: "First name", nachname: "Last name", strasse: "Street + No.", wohnung: "Apt.",
    stadt: "City", oblast: "Region", index: "ZIP code", telefon: "Phone",
    indexHint: "6 digits", telefonHint: "+7 7XX XXX XX XX",
  } : {
    vorname: "Имя", nachname: "Фамилия", strasse: "Улица, дом", wohnung: "Квартира",
    stadt: "Город", oblast: "Область", index: "Почтовый индекс", telefon: "Телефон",
    indexHint: "6 цифр", telefonHint: "+7 7XX XXX XX XX",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label={labels.vorname}  name={`${prefix}vorname`}  defaultValue={initial?.vorname}  required />
        <Input label={labels.nachname} name={`${prefix}nachname`} defaultValue={initial?.nachname} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-2">
          <Input label={labels.strasse} name={`${prefix}strasse`} defaultValue={initial?.strasse} required />
        </div>
        <Input label={labels.wohnung} name={`${prefix}wohnung`} defaultValue={initial?.wohnung} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label={labels.stadt} name={`${prefix}stadt`} defaultValue={initial?.stadt} required />
        <Select label={labels.oblast} name={`${prefix}oblast`} required
          defaultValue={initial?.oblast}
          options={OBLASTS.map(o => ({ value: o.code, label: oblastLabel(o) }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={labels.index}
          name={`${prefix}index`}
          value={index}
          onChange={(e) => setIndex(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          placeholder="050000"
          maxLength={6}
          hint={labels.indexHint}
          error={index && !istValiderIndex(index) ? labels.indexHint : undefined}
        />
        <Input
          label={labels.telefon}
          name={`${prefix}telefon`}
          type="tel"
          value={telefon}
          onChange={(e) => setTelefon(formatTelefon(e.target.value))}
          required
          placeholder="+7 700 000 00 00"
          hint={labels.telefonHint}
          error={telefon && !istValideTelefon(telefon) ? labels.telefonHint : undefined}
        />
      </div>

      <input type="hidden" name={`${prefix}land`} value="KZ" />
    </div>
  );
}
