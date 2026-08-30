/**
 * Phase 1 TypeScript Models - Canonical field names must match API and Database exactly
 */

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
  assigned_nurse: number; // user ID
  scheduled_start: string; // ISO 8601
  scheduled_end: string; // ISO 8601
  pre_dialysis_bp?: string;
  during_dialysis_bp?: string;
  post_dialysis_bp?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  patient_name?: string;
  machine_name?: string;
  nurse_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VitalSign {
  id?: number;
  session: number; // session ID (not used in create, set by nested route)
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
