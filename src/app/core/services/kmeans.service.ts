import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KMeansResponse } from '../models/kmeans.model';

@Injectable({
  providedIn: 'root',
})
export class KMeansService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getClusters(
    k: number = 3,
    departmentId?: number | null,
    seed: number = 42,
    includeDischarged: boolean = false
  ): Observable<KMeansResponse> {
    let params = new HttpParams()
      .set('k', k.toString())
      .set('seed', seed.toString());

    if (departmentId != null) {
      params = params.set('department', departmentId.toString());
    }
    if (includeDischarged) {
      params = params.set('include_discharged', 'true');
    }

    return this.http.get<KMeansResponse>(`${this.apiBase}/reports/kmeans-clusters/`, { params });
  }
}
