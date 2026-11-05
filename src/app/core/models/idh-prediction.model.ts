export interface IdhInputWindowStep {
  step: number;
  systolic_bp: number;
  diastolic_bp: number;
  map?: number;
  sbp_drop_from_baseline?: number;
  heart_rate: number;
  ufr_ml_kg_h?: number;
  cumulative_uf_pct?: number;
  time_elapsed_min: number;
  uf_rate?: number;
  cumulative_uf?: number;
}

export interface IdhPredictionResponse {
  has_prediction: boolean;
  status: 'READY' | 'INSUFFICIENT_DATA';
  message?: string;
  prediction_id?: string;
  patient_id?: string;
  session_id?: string;
  risk_probability?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  is_idh_predicted?: boolean;
  threshold_used?: number;
  contributing_factors?: string[];
  clinical_recommendations?: string[];
  sequence_length_received?: number;
  inference_source?: 'FASTAPI_MICROSERVICE' | 'LOCAL_PYTORCH_FALLBACK' | 'LOCAL_LSTM_ENGINE' | string;
  service_url?: string;
  fastapi_inference_ms?: number;
  round_trip_latency_ms?: number;
  input_window_payload?: IdhInputWindowStep[];
  is_interpolated?: boolean;
  is_padded?: boolean;
  recorded_vitals_count?: number;
  dry_weight?: number;
  model_version?: string;
  predicted_at?: string;
  disclaimer?: string;
}

export interface LstmTrainingEpoch {
  epoch: number;
  train_loss: number;
  val_loss: number;
  train_accuracy: number;
  val_accuracy: number;
  train_f1: number;
  val_f1: number;
}

export interface LstmMetricsSet {
  loss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix: number[][];
  sample_count: number;
}

export interface LstmHyperparameterExperiment {
  exp_id: string;
  num_layers: number;
  hidden_dim: number;
  dropout: number;
  learning_rate: number;
  batch_size: number;
  val_loss: number;
  val_accuracy: number;
  val_f1: number;
  val_roc_auc: number;
  selected: boolean;
  note: string;
}

export interface LstmModelInfoResponse {
  model_name: string;
  framework?: string;
  architecture?: string;
  input_features?: string[];
  sequence_length?: number;
  split_strategy?: string;
  dataset_splits?: Record<string, any>;
  metrics?: {
    train?: LstmMetricsSet;
    validation?: LstmMetricsSet;
    test?: LstmMetricsSet;
  };
  training_history?: LstmTrainingEpoch[];
  training_hyperparameters?: Record<string, any>;
  hyperparameter_tuning?: LstmHyperparameterExperiment[];
  status?: string;
}
