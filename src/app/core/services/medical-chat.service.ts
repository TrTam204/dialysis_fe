import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedicalMessage, OnlineStaff, ConversationsResponse, MentionSuggestionsResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MedicalChatService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getOnlineStatus(): Observable<{ count_online: number; total_staff: number; staff: OnlineStaff[] }> {
    return this.http.get<{ count_online: number; total_staff: number; staff: OnlineStaff[] }>(
      `${this.apiBase}/users/online-status/`
    );
  }

  getConversations(): Observable<ConversationsResponse> {
    return this.http.get<ConversationsResponse>(`${this.apiBase}/chat/messages/conversations/`);
  }

  getMessages(params?: { receiver?: number; channel?: string; session?: string }): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/chat/messages/`, { params });
  }

  markRead(payload: { target_id?: number; receiver?: number; channel?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/chat/messages/mark-read/`, payload);
  }

  getMentionSuggestions(q = ''): Observable<MentionSuggestionsResponse> {
    return this.http.get<MentionSuggestionsResponse>(
      `${this.apiBase}/chat/messages/mention-suggestions/`,
      { params: q ? { q } : {} }
    );
  }

  sendMessage(data: FormData | {
    content?: string;
    receiver?: number | null;
    recipient?: number | null;
    session_reference?: string | null;
    attachment_type?: string | null;
    attachment_name?: string | null;
    metadata?: any;
  }): Observable<MedicalMessage> {
    return this.http.post<MedicalMessage>(`${this.apiBase}/chat/messages/`, data);
  }
}
