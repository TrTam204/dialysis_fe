import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TopsisCriteriaResponse,
  TopsisRankRequest,
  TopsisRankResponse,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class TopsisService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCriteria(): Observable<TopsisCriteriaResponse> {
    return this.http.get<TopsisCriteriaResponse>(`${this.apiBase}/topsis/criteria/`);
  }

  rank(request: TopsisRankRequest): Observable<TopsisRankResponse> {
    return this.http.post<TopsisRankResponse>(`${this.apiBase}/topsis/rank/`, request);
  }
}
