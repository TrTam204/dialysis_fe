import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { KMeansService } from '../../core/services/kmeans.service';
import { KMeansClusteringComponent } from './kmeans-clustering.component';
import { KMeansResponse } from '../../core/models';

describe('KMeansClusteringComponent', () => {
  let component: KMeansClusteringComponent;
  let fixture: ComponentFixture<KMeansClusteringComponent>;
  let mockKMeansService: jasmine.SpyObj<KMeansService>;
  let mockDepartmentService: jasmine.SpyObj<DepartmentService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockResponse: KMeansResponse = {
    success: true,
    k_value: 3,
    wcss: 0.2451,
    silhouette_score: 0.5812,
    centroids: [
      [0.2, 0.8, 0.3, 0.2],
      [0.8, 0.2, 0.9, 0.8],
      [0.5, 0.5, 0.5, 0.5],
    ],
    denormalized_centroids: [
      { age: 30.0, avg_hemoglobin: 13.0, avg_potassium: 4.0, avg_uf: 1.2 },
      { age: 76.0, avg_hemoglobin: 8.0, avg_potassium: 6.8, avg_uf: 4.5 },
      { age: 51.0, avg_hemoglobin: 10.5, avg_potassium: 5.2, avg_uf: 2.6 },
    ],
    cluster_summaries: [
      {
        cluster_id: 0,
        cluster_label: 'Cụm 1',
        patient_count: 1,
        risk_level: 'LOW',
        tags: ['Trẻ tuổi (<45)', 'Hemoglobin đạt mục tiêu (Hb >= 11)', 'Kali ổn định (3.5-5.0)'],
        recommendation: 'Ổn định, theo dõi thường quy.',
        centroid: { age: 30.0, avg_hemoglobin: 13.0, avg_potassium: 4.0, avg_uf: 1.2 },
      },
      {
        cluster_id: 1,
        cluster_label: 'Cụm 2',
        patient_count: 1,
        risk_level: 'HIGH',
        tags: ['Cao tuổi (>65)', 'Thiếu máu nặng (Hb < 9.5)', 'Tăng kali nguy hiểm (>6.0)'],
        recommendation: 'Nguy cơ cao, theo dõi sát.',
        centroid: { age: 76.0, avg_hemoglobin: 8.0, avg_potassium: 6.8, avg_uf: 4.5 },
      },
      {
        cluster_id: 2,
        cluster_label: 'Cụm 3',
        patient_count: 1,
        risk_level: 'MEDIUM',
        tags: ['Trung niên (45-65)', 'Thiếu máu nhẹ (Hb 9.5-11)', 'Tăng kali vừa (5.0-6.0)'],
        recommendation: 'Nguy cơ trung bình.',
        centroid: { age: 51.0, avg_hemoglobin: 10.5, avg_potassium: 5.2, avg_uf: 2.6 },
      },
    ],
    min_max: {
      age: { min: 30, max: 76 },
      avg_hemoglobin: { min: 8.0, max: 13.0 },
      avg_potassium: { min: 4.0, max: 6.8 },
      avg_uf: { min: 1.2, max: 4.5 },
    },
    clusters: {
      '0': [
        {
          patient_id: 'PT-01',
          full_name: 'Nguyen Van Tre',
          cluster_id: 0,
          status: 'ACTIVE',
          features: { age: 30.0, avg_hemoglobin: 13.0, avg_potassium: 4.0, avg_uf: 1.2 },
        },
      ],
      '1': [
        {
          patient_id: 'PT-02',
          full_name: 'Tran Thi Gia',
          cluster_id: 1,
          status: 'ACTIVE',
          features: { age: 76.0, avg_hemoglobin: 8.0, avg_potassium: 6.8, avg_uf: 4.5 },
        },
      ],
      '2': [
        {
          patient_id: 'PT-03',
          full_name: 'Le Van Trung',
          cluster_id: 2,
          status: 'ACTIVE',
          features: { age: 51.0, avg_hemoglobin: 10.5, avg_potassium: 5.2, avg_uf: 2.6 },
        },
      ],
    },
    patients: [
      {
        patient_id: 'PT-01',
        full_name: 'Nguyen Van Tre',
        cluster_id: 0,
        status: 'ACTIVE',
        features: { age: 30.0, avg_hemoglobin: 13.0, avg_potassium: 4.0, avg_uf: 1.2 },
      },
      {
        patient_id: 'PT-02',
        full_name: 'Tran Thi Gia',
        cluster_id: 1,
        status: 'ACTIVE',
        features: { age: 76.0, avg_hemoglobin: 8.0, avg_potassium: 6.8, avg_uf: 4.5 },
      },
      {
        patient_id: 'PT-03',
        full_name: 'Le Van Trung',
        cluster_id: 2,
        status: 'ACTIVE',
        features: { age: 51.0, avg_hemoglobin: 10.5, avg_potassium: 5.2, avg_uf: 2.6 },
      },
    ],
    iterations: 3,
    converged: true,
  };

  beforeEach(async () => {
    mockKMeansService = jasmine.createSpyObj('KMeansService', ['getClusters']);
    mockDepartmentService = jasmine.createSpyObj('DepartmentService', ['getAll']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getUser']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockDepartmentService.getAll.and.returnValue(
      of([
        { id: 1, name: 'Khoa Than Loc Mau', code: 'K-TLM', is_active: true },
      ])
    );
    mockKMeansService.getClusters.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [KMeansClusteringComponent, NoopAnimationsModule],
      providers: [
        { provide: KMeansService, useValue: mockKMeansService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KMeansClusteringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load initial clustering', () => {
    expect(component).toBeTruthy();
    expect(mockKMeansService.getClusters).toHaveBeenCalled();
    expect(component.result).toEqual(mockResponse);
    expect(component.scatterChartData).toBeTruthy();
    expect(component.barChartData).toBeTruthy();
  });

  it('should render KPI values correctly', () => {
    expect(component.result?.patients.length).toBe(3);
    expect(component.result?.k_value).toBe(3);
    expect(component.result?.wcss).toBe(0.2451);
    expect(component.result?.silhouette_score).toBe(0.5812);
  });

  it('should filter patients by cluster when selected', () => {
    component.selectedClusterFilter = 0;
    const filtered = component.getFilteredPatients();
    expect(filtered.length).toBe(1);
    expect(filtered[0].patient_id).toBe('PT-01');

    component.selectedClusterFilter = null;
    expect(component.getFilteredPatients().length).toBe(3);
  });

  it('should rebuild scatter chart on axis change', () => {
    component.xAxisFeature = 'age';
    component.yAxisFeature = 'avg_hemoglobin';
    component.onAxisChange();

    expect(component.scatterChartData).toBeTruthy();
    expect(component.scatterChartOptions.scales.x.title.text).toContain('Tuổi');
    expect(component.scatterChartOptions.scales.y.title.text).toContain('Hemoglobin');
  });

  it('should evaluate silhouette score quality correctly', () => {
    const good = component.getSilhouetteQuality(0.6);
    expect(good.severity).toBe('success');

    const mod = component.getSilhouetteQuality(0.35);
    expect(mod.severity).toBe('warning');

    const weak = component.getSilhouetteQuality(0.1);
    expect(weak.severity).toBe('danger');
  });

  it('should navigate to patient detail when viewPatient is called', () => {
    component.viewPatient('PT-01');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/patients', 'PT-01']);
  });

  it('should handle service error gracefully', () => {
    mockKMeansService.getClusters.and.returnValue(
      throwError(() => ({ error: { detail: 'Clustering failed' } }))
    );
    component.runClustering();
    expect(component.loading).toBeFalse();
  });
});
