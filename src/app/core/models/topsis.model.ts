export type CriterionType = 'benefit' | 'cost';

export interface TopsisCriterion {
  code: string;
  name: string;
  unit: string;
  type: CriterionType;
  weight: number;
  default_value?: number;
  min_val?: number;
  max_val?: number;
  description: string;
}

export interface TopsisCriteriaResponse {
  criteria: TopsisCriterion[];
  is_clinical_approved: boolean;
  version: string;
  disclaimer: string;
}

export interface TopsisPatientDetail {
  patient_id: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string;
  status: string;
  treatment_pattern?: string | null;
  preferred_shift?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  potassium_level: number;
  hemoglobin_level: number;
  blood_sample_date?: string | null;
  days_since_dialysis: number;
  last_session_date?: string | null;
  fluid_overload_kg: number;
  distance_km: number;
  has_location: boolean;
}

export interface TopsisAlternativeRanking {
  rank: number;
  alternative_id: string;
  original_index: number;
  closeness_score: number;
  distance_positive: number;
  distance_negative: number;
  raw_values: number[];
  patient: TopsisPatientDetail;
}

export interface TopsisRankResponse {
  department_id?: number | null;
  department_name?: string;
  calculated_at: string;
  total_patients: number;
  criteria: TopsisCriterion[];
  ideal_positive: number[];
  ideal_negative: number[];
  rankings: TopsisAlternativeRanking[];
  is_clinical_approved: boolean;
  disclaimer: string;
  detail?: string;
}

export interface TopsisRankRequest {
  department?: number | null;
  custom_weights?: Record<string, number>;
  patient_ids?: string[];
  center_coordinates?: [number, number];
}
