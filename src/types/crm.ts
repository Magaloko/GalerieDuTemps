export type TaskStatus     = "offen" | "in_arbeit" | "erledigt" | "abgebrochen";
export type TaskPrioritaet = "niedrig" | "normal" | "hoch" | "dringend";
export type DripTriggerTyp = "signup" | "first_order" | "b2b_approved" | "winback" | "manual" | "tag_added";

export interface PipelineStage {
  id:           number;
  name:         string;
  farbe:        string;
  sortierung:   number;
  ist_initial:  boolean;
  ist_final:    boolean;
  aktiv:        boolean;
}

export interface Tag {
  id:           number;
  name:         string;
  farbe:        string;
  beschreibung: string | null;
  erstellt_am:  string;
  anzahl?:      number;   // Counter aus JOIN
}

export interface Note {
  id:           string;
  customer_id:  string;
  inhalt:       string;
  pinned:       boolean;
  erstellt_von: string | null;
  erstellt_von_name?: string;
  erstellt_am:  string;
}

export interface Task {
  id:                string;
  titel:             string;
  beschreibung:      string | null;
  customer_id:       string | null;
  customer_name?:    string;
  customer_email?:   string;
  zugewiesen_an:     string | null;
  zugewiesen_an_name?: string;
  erstellt_von:      string | null;
  prioritaet:        TaskPrioritaet;
  status:            TaskStatus;
  faellig_am:        string | null;
  erledigt_am:       string | null;
  erstellt_am:       string;
  aktualisiert_am:   string;
}

export interface Segment {
  id:           string;
  name:         string;
  beschreibung: string | null;
  filter:       SegmentFilter;
  erstellt_am:  string;
  treffer?:     number;   // Aus Live-Vorschau
}

export interface SegmentFilter {
  customer_type?: string[];
  tags?:          number[];
  stage_id?:      number;
  newsletter?:    boolean;
  min_orders?:    number;
  min_summe_cent?: number;
  dnc_aktiv?:     boolean;
}

export interface DripFlow {
  id:           string;
  name:         string;
  beschreibung: string | null;
  trigger_typ:  DripTriggerTyp;
  trigger_param: string | null;
  segment_id:   string | null;
  aktiv:        boolean;
  erstellt_am:  string;
  schritte?:    DripFlowStep[];
}

export interface DripFlowStep {
  id:            number;
  flow_id:       string;
  schritt_nr:    number;
  delay_stunden: number;
  betreff:       string;
  html_content:  string;
}

export interface CrmEvent {
  id:             number;
  customer_id:    string | null;
  customer_email: string | null;
  typ:            string;
  daten:          Record<string, unknown>;
  quelle:         string | null;
  erstellt_am:    string;
}
