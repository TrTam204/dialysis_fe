/**
 * Phase 1 TypeScript Models - Canonical field names must match API and Database exactly
 */
import { ShiftType, TreatmentPatternType } from './schedule-plan.model';

export interface Department {
  id?: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomUser {
  id?: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  department: number; // department ID
  role: 'ADMIN' | 'DOCTOR' | 'NURSE';
  is_active: boolean;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Patient {
  patient_id: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone_number?: string | null;
  medical_history?: string;
  dry_weight?: number | null;
  location?: string | null; // GeoJSON - do not parse in Phase 1
  status: 'ACTIVE' | 'IN_TREATMENT' | 'STABLE' | 'DISCHARGED';
  preferred_shift?: ShiftType | null;
  treatment_pattern?: TreatmentPatternType | null;
  created_at?: string;
  updated_at?: string;
}

export interface DialysisMachine {
  machine_id: string;
  name: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN';
  maintenance_log?: string;
  last_maintenance_date?: string | null; // YYYY-MM-DD
  department: number; // department ID
  created_at?: string;
  updated_at?: string;
}

export interface BloodSample {
  sample_id: string;
  patient: string; // patient_id
  collection_date: string; // ISO 8601
  hemoglobin_level: number;
  potassium_level: number;
  notes?: string;
  created_by: number; // user ID
  created_at?: string;
}

export interface DialysisSession {
  session_id: string;
  patient: string; // patient_id
  machine: string; // machine_id
  assigned_nurse?: number | null; // user ID (nullable in M9)
  scheduled_start: string; // ISO 8601
  scheduled_end: string; // ISO 8601
  actual_start?: string | null;
  actual_end?: string | null;
  pre_weight?: number | null;
  post_weight?: number | null;
  uf_target?: number | null;
  uf_actual?: number | null;
  clinical_notes?: string;
  pre_dialysis_bp?: string;
  during_dialysis_bp?: string;
  post_dialysis_bp?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  patient_name?: string;
  patient_code?: string;
  patient_dry_weight?: number | null;
  machine_name?: string;
  nurse_name?: string;
  schedule_assignment?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface VitalSign {
  id?: number;
  session: string | number; // session ID
  recorded_by: number; // user ID (auto-set by backend)
  recorded_at: string; // ISO 8601
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  notes?: string;
  recorded_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'ADMIN' | 'DOCTOR' | 'NURSE';
    department?: number;
    department_name?: string;
    phone_number?: string;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  password: string;
}

export interface DashboardSummary {
  total_patients: number;
  total_staff: number;
  total_sessions: number;
  total_sessions_today: number;
  active_machines: number;
}

export interface DialysisSessionStats {
  date: string;
  count: number;
}

export interface MachineStats {
  status: string;
  count: number;
}

export interface DailyTrend {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  scheduled: number;
  in_progress: number;
}

export interface OperationalSummaryReport {
  date_from: string;
  date_to: string;
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  scheduled_sessions: number;
  in_progress_sessions: number;
  completion_rate: number;
  total_uf_target: number;
  total_uf_actual: number;
  daily_trends: DailyTrend[];
}

export interface MachineUtilizationItem {
  machine_id: string;
  name: string;
  status: string;
  department_id?: number | null;
  department_name?: string | null;
  last_maintenance_date?: string | null;
  session_count: number;
  completed_count: number;
  cancelled_count: number;
  actual_runtime_hours: number;
  actual_runtime_minutes: number;
}

export interface MachineUtilizationReport {
  date_from: string;
  date_to: string;
  limitation_note: string;
  total_machines: number;
  total_completed_sessions: number;
  total_runtime_hours: number;
  machines: MachineUtilizationItem[];
}

export * from './audit-log.model';
export * from './schedule-plan.model';
