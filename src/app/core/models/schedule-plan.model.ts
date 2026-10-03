export type ShiftType = 'SHIFT_1' | 'SHIFT_2' | 'SHIFT_3';
export type TreatmentPatternType = 'T2_T4_T6' | 'T3_T5_T7';
export type SchedulePlanStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED';
export type AssignmentSource = 'GA' | 'MANUAL';

export interface SchedulePlan {
  id?: number;
  name: string;
  department: number;
  department_name?: string;
  week_start: string; // YYYY-MM-DD
  week_end: string; // YYYY-MM-DD
  status: SchedulePlanStatus;
  fitness_score?: number | null;
  algorithm_metadata?: Record<string, any>;
  created_by?: number | null;
  created_by_name?: string | null;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  assignments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleAssignment {
  id?: number;
  schedule_plan: number;
  patient: string; // patient_id
  patient_name?: string;
  patient_code?: string;
  machine: string; // machine_id
  machine_name?: string;
  scheduled_date: string; // YYYY-MM-DD
  shift: ShiftType;
  start_datetime: string; // ISO 8601
  end_datetime: string; // ISO 8601
  source: AssignmentSource;
  original_machine?: string | null;
  original_shift?: ShiftType | null;
  created_at?: string;
  updated_at?: string;
}
