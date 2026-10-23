/**
 * K-Means Unsupervised Patient Clustering Models (Milestone Week 9)
 */

export interface PatientClusterFeatures {
  age: number;
  avg_hemoglobin: number;
  avg_potassium: number;
  avg_uf: number;
}

export interface ClusteredPatient {
  patient_id: string;
  full_name: string;
  cluster_id: number;
  status: string;
  is_imputed?: boolean;
  imputed_fields?: string[];
  features: PatientClusterFeatures;
  normalized_features?: PatientClusterFeatures;
}

export interface ClusterSummary {
  cluster_id: number;
  cluster_label: string;
  patient_count: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  recommendation: string;
  centroid: PatientClusterFeatures;
}

export interface FeatureMinMax {
  min: number;
  max: number;
}

export interface KMeansResponse {
  success: boolean;
  k_value: number;
  seed?: number;
  wcss: number;
  silhouette_score: number;
  centroids: number[][];
  denormalized_centroids: PatientClusterFeatures[];
  cluster_summaries: ClusterSummary[];
  min_max: Record<string, FeatureMinMax>;
  clusters: Record<string, ClusteredPatient[]>;
  patients: ClusteredPatient[];
  iterations: number;
  converged: boolean;
  disclaimer?: string;
}
