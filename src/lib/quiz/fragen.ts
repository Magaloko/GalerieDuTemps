/**
 * Personality-Quiz: 5 Fragen, 4 Antworten je Frage.
 * Jede Antwort verteilt Punkte auf 4 Archetypen.
 *
 * Archetypen → spätere Produkt-Empfehlungen via tags/kategorien.
 */

export type Archetyp = "esthete" | "rebel" | "nostalgic" | "minimalist";

export interface Antwort {
  text:   string;
  scores: Partial<Record<Archetyp, number>>;
  /** Optional: Kategorien-Slugs für die Empfehlungs-Engine */
  tags?:  string[];
}

export interface Frage {
  id:        string;
  eyebrow:   string;   // z.B. "Frage 1 von 5"
  titel:     string;
  antworten: [Antwort, Antwort, Antwort, Antwort];
}

export const QUIZ_FRAGEN: Frage[] = [
  {
    id:      "epoche",
    eyebrow: "Эпоха",
    titel:   "Какая эпоха ближе всего вашему сердцу?",
    antworten: [
      { text: "Ар-деко 1920-х — золото и геометрия",       scores: { esthete: 2, nostalgic: 1 }, tags: ["art-deco", "украшения"] },
      { text: "1960-е — космос, цвет и оптимизм",           scores: { rebel: 2, esthete: 1 },     tags: ["mid-century", "мебель"] },
      { text: "1970-е — богема, бархат и пластинки",        scores: { rebel: 1, nostalgic: 2 },   tags: ["винил", "мода"] },
      { text: "Скандинавия 1950-х — чистая форма",          scores: { minimalist: 2, esthete: 1 }, tags: ["мебель", "дизайн"] },
    ],
  },
  {
    id:      "material",
    eyebrow: "Материал",
    titel:   "К чему вы тянетесь рукой?",
    antworten: [
      { text: "Тёплый дуб и патинированная бронза",         scores: { nostalgic: 2, esthete: 1 },  tags: ["мебель", "дерево"] },
      { text: "Хрусталь, фарфор, перламутр",                scores: { esthete: 2 },                tags: ["посуда", "фарфор"] },
      { text: "Кожа, латунь, потёртый деним",               scores: { rebel: 2, nostalgic: 1 },    tags: ["мода", "аксессуары"] },
      { text: "Светлое дерево, лён, керамика",              scores: { minimalist: 2 },             tags: ["мебель", "дизайн"] },
    ],
  },
  {
    id:      "raum",
    eyebrow: "Пространство",
    titel:   "Как выглядит ваш идеальный вечер дома?",
    antworten: [
      { text: "Свечи, бокал вина, виниловая пластинка",     scores: { nostalgic: 2, esthete: 1 },  tags: ["винил", "посуда"] },
      { text: "Книга в кресле у окна — и тишина",           scores: { minimalist: 2, nostalgic: 1 }, tags: ["мебель", "искусство"] },
      { text: "Друзья, разговоры, гитара в углу",           scores: { rebel: 2 },                  tags: ["мода"] },
      { text: "Ужин на красивом столе при свечах",          scores: { esthete: 2 },                tags: ["посуда", "фарфор"] },
    ],
  },
  {
    id:      "stil",
    eyebrow: "Стиль",
    titel:   "Ваша любимая вещь в гардеробе?",
    antworten: [
      { text: "Жемчужное колье от бабушки",                 scores: { nostalgic: 2, esthete: 1 },  tags: ["украшения"] },
      { text: "Винтажная кожаная куртка с историей",        scores: { rebel: 2, nostalgic: 1 },    tags: ["мода"] },
      { text: "Шёлковое платье с этикеткой 60-х",           scores: { esthete: 2, rebel: 1 },      tags: ["мода"] },
      { text: "Кашемировый пуловер нейтрального цвета",     scores: { minimalist: 2 },             tags: ["мода"] },
    ],
  },
  {
    id:      "wert",
    eyebrow: "Ценность",
    titel:   "Что для вас важнее всего в вещи?",
    antworten: [
      { text: "Красота формы и линии",                      scores: { esthete: 2, minimalist: 1 } },
      { text: "История и душа предмета",                    scores: { nostalgic: 2 } },
      { text: "Уникальность — единственная в своём роде",   scores: { rebel: 2, esthete: 1 } },
      { text: "Простота и качество ремесла",                scores: { minimalist: 2 } },
    ],
  },
];

export interface QuizResult {
  archetyp:    Archetyp;
  titel:       string;
  zitat:       string;
  beschreibung:string;
  empfohlene_tags: string[];
}

export const QUIZ_RESULTS: Record<Archetyp, QuizResult> = {
  esthete: {
    archetyp:    "esthete",
    titel:       "Эстет",
    zitat:       "«Красота спасёт мир»",
    beschreibung:
      "Вы цените линию, форму и пропорцию. Ар-деко, фарфор Meissen, " +
      "хрусталь Baccarat — вещи, в которых ремесло встречается с изяществом. " +
      "Ваш дом — это маленькая галерея.",
    empfohlene_tags: ["art-deco", "фарфор", "украшения", "посуда", "хрусталь"],
  },
  rebel: {
    archetyp:    "rebel",
    titel:       "Бунтарь",
    zitat:       "«Стандарт — это только начало»",
    beschreibung:
      "Вы ищете вещи, которых ни у кого нет. Винтажная кожа, виниловые " +
      "пластинки джаза 60-х, единственная в своём роде брошь — у каждой " +
      "вещи должна быть собственная история.",
    empfohlene_tags: ["винил", "мода", "кожа", "аксессуары", "уникальный"],
  },
  nostalgic: {
    archetyp:    "nostalgic",
    titel:       "Ностальгик",
    zitat:       "«Le temps embellit toute chose»",
    beschreibung:
      "Прошлое для вас — не музей, а тёплый дом. Патина на бронзе, " +
      "потёртое дерево, бабушкин жемчуг — всё, что хранит память. " +
      "Вы покупаете не вещь — вы покупаете её историю.",
    empfohlene_tags: ["мебель", "украшения", "винтаж", "патина", "наследие"],
  },
  minimalist: {
    archetyp:    "minimalist",
    titel:       "Минималист",
    zitat:       "«Меньше — значит больше»",
    beschreibung:
      "Скандинавский модерн, чистые линии, благородные материалы. " +
      "Вы выбираете немного, но безупречно. В вашем доме каждая вещь " +
      "имеет смысл — и место.",
    empfohlene_tags: ["мебель", "дизайн", "scandinavian", "mid-century", "дерево"],
  },
};

/** Berechnet den dominanten Archetyp aus den Antworten */
export function berechneArchetyp(
  antworten: Antwort[]
): { archetyp: Archetyp; sortiert: Array<[Archetyp, number]> } {
  const scores: Record<Archetyp, number> = {
    esthete: 0, rebel: 0, nostalgic: 0, minimalist: 0,
  };
  for (const a of antworten) {
    for (const [k, v] of Object.entries(a.scores)) {
      scores[k as Archetyp] += v ?? 0;
    }
  }
  const sortiert = (Object.entries(scores) as Array<[Archetyp, number]>)
    .sort((a, b) => b[1] - a[1]);
  return { archetyp: sortiert[0][0], sortiert };
}
