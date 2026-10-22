import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';
import { IdhPredictionResponse, LstmModelInfoResponse } from '../models';

describe('SessionService', () => {
  let service: SessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call GET /api/sessions/<id>/idh-prediction/ and return IdhPredictionResponse', () => {
    const sessionId = 'SES-TEST-001';
    const mockResponse: IdhPredictionResponse = {
      has_prediction: true,
      status: 'READY',
      prediction_id: 'pred-1234',
      patient_id: 'PAT-001',
      session_id: sessionId,
      risk_probability: 0.725,
      risk_level: 'HIGH',
      is_idh_predicted: true,
      threshold_used: 0.5,
      contributing_factors: ['HA tâm thu giảm nhanh', 'Tốc độ UF cao'],
      clinical_recommendations: ['Giảm tốc độ UF', 'Kiểm tra HA mỗi 15 phút'],
      inference_source: 'FASTAPI_MICROSERVICE',
      is_padded: false,
      recorded_vitals_count: 5,
    };

    service.getIdhPrediction(sessionId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(res.risk_level).toBe('HIGH');
      expect(res.risk_probability).toBe(0.725);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/sessions/${sessionId}/idh-prediction/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call GET /api/ai/lstm-model-info/ and return LstmModelInfoResponse', () => {
    const mockInfo: LstmModelInfoResponse = {
      model_name: 'IDHLSTMNet',
      framework: 'PyTorch',
      architecture: '2-layer Bidirectional LSTM + Linear + Sigmoid',
      input_features: ['systolic_bp', 'diastolic_bp', 'map', 'heart_rate', 'uf_rate', 'cumulative_uf'],
      sequence_length: 3,
      metrics: {
        test: {
          loss: 0.0521,
          accuracy: 0.985,
          precision: 0.962,
          recall: 0.971,
          f1_score: 0.966,
          roc_auc: 0.992,
          confusion_matrix: [
            [300, 5],
            [3, 92],
          ],
          sample_count: 400,
        },
      },
      training_history: [
        {
          epoch: 1,
          train_loss: 0.48,
          val_loss: 0.44,
          train_accuracy: 0.82,
          val_accuracy: 0.8,
          train_f1: 0.75,
          val_f1: 0.74,
        },
      ],
    };

    service.getLstmModelInfo().subscribe((info) => {
      expect(info.model_name).toBe('IDHLSTMNet');
      expect(info.metrics?.test?.accuracy).toBe(0.985);
      expect(info.training_history?.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/ai/lstm-model-info/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInfo);
  });
});
