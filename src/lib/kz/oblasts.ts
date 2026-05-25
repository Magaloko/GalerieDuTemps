/**
 * Kasachstan-Verwaltungseinheiten
 * 3 Städte republikanischer Bedeutung + 17 Oblasts (Stand 2024 nach Reform)
 */

export interface Oblast {
  code:    string;      // Kurz-Code (z.B. "ALA")
  name_ru: string;      // Russisch
  name_kz: string;      // Kasachisch
  name_en: string;      // Englisch (für intl. UI)
  hauptstadt: string;   // Hauptstadt der Region
  typ: "stadt" | "oblast";  // Stadt republikanischer Bedeutung oder Oblast
}

export const OBLASTS: Oblast[] = [
  // Städte republikanischer Bedeutung
  { code: "ALA", name_ru: "Алматы",          name_kz: "Алматы",         name_en: "Almaty",        hauptstadt: "Алматы",      typ: "stadt"  },
  { code: "AST", name_ru: "Астана",          name_kz: "Астана",         name_en: "Astana",        hauptstadt: "Астана",      typ: "stadt"  },
  { code: "SHY", name_ru: "Шымкент",         name_kz: "Шымкент",        name_en: "Shymkent",      hauptstadt: "Шымкент",     typ: "stadt"  },

  // Oblasts (17, Stand 2024)
  { code: "AKM", name_ru: "Акмолинская",     name_kz: "Ақмола",         name_en: "Akmola",        hauptstadt: "Кокшетау",    typ: "oblast" },
  { code: "AKT", name_ru: "Актюбинская",     name_kz: "Ақтөбе",         name_en: "Aktobe",        hauptstadt: "Актобе",      typ: "oblast" },
  { code: "ALM", name_ru: "Алматинская",     name_kz: "Алматы",         name_en: "Almaty Oblast", hauptstadt: "Конаев",      typ: "oblast" },
  { code: "ATY", name_ru: "Атырауская",      name_kz: "Атырау",         name_en: "Atyrau",        hauptstadt: "Атырау",      typ: "oblast" },
  { code: "VKO", name_ru: "Восточно-Казахстанская", name_kz: "Шығыс Қазақстан", name_en: "East Kazakhstan", hauptstadt: "Усть-Каменогорск", typ: "oblast" },
  { code: "ZHA", name_ru: "Жамбылская",      name_kz: "Жамбыл",         name_en: "Jambyl",        hauptstadt: "Тараз",       typ: "oblast" },
  { code: "ZKO", name_ru: "Западно-Казахстанская", name_kz: "Батыс Қазақстан", name_en: "West Kazakhstan", hauptstadt: "Уральск", typ: "oblast" },
  { code: "KAR", name_ru: "Карагандинская",  name_kz: "Қарағанды",      name_en: "Karaganda",     hauptstadt: "Караганда",   typ: "oblast" },
  { code: "KOS", name_ru: "Костанайская",    name_kz: "Қостанай",       name_en: "Kostanay",      hauptstadt: "Костанай",    typ: "oblast" },
  { code: "KZY", name_ru: "Кызылординская",  name_kz: "Қызылорда",      name_en: "Kyzylorda",     hauptstadt: "Кызылорда",   typ: "oblast" },
  { code: "MAN", name_ru: "Мангистауская",   name_kz: "Маңғыстау",      name_en: "Mangystau",     hauptstadt: "Актау",       typ: "oblast" },
  { code: "PAV", name_ru: "Павлодарская",    name_kz: "Павлодар",       name_en: "Pavlodar",      hauptstadt: "Павлодар",    typ: "oblast" },
  { code: "SKO", name_ru: "Северо-Казахстанская", name_kz: "Солтүстік Қазақстан", name_en: "North Kazakhstan", hauptstadt: "Петропавловск", typ: "oblast" },
  { code: "TUR", name_ru: "Туркестанская",   name_kz: "Түркістан",      name_en: "Turkestan",     hauptstadt: "Туркестан",   typ: "oblast" },
  // Reform 2022: neue Oblasts
  { code: "ABA", name_ru: "Абайская",        name_kz: "Абай",           name_en: "Abai",          hauptstadt: "Семей",       typ: "oblast" },
  { code: "JTY", name_ru: "Жетысуская",      name_kz: "Жетісу",         name_en: "Jetisu",        hauptstadt: "Талдыкорган", typ: "oblast" },
  { code: "ULY", name_ru: "Улытауская",      name_kz: "Ұлытау",         name_en: "Ulytau",        hauptstadt: "Жезказган",   typ: "oblast" },
];

export function oblastByCode(code: string): Oblast | undefined {
  return OBLASTS.find(o => o.code === code.toUpperCase());
}

export function oblastByName(name: string): Oblast | undefined {
  const n = name.toLowerCase();
  return OBLASTS.find(o =>
    o.name_ru.toLowerCase() === n ||
    o.name_kz.toLowerCase() === n ||
    o.name_en.toLowerCase() === n
  );
}
