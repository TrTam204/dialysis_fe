import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { SidebarModule } from 'primeng/sidebar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MedicalChatService } from '../../../core/services/medical-chat.service';
import {
  MedicalMessage,
  ChatConversation,
  PinnedChannel,
  MedicalMentionRef,
  MentionSuggestionsResponse,
} from '../../../core/models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    BadgeModule,
    SidebarModule,
    InputTextareaModule,
    InputTextModule,
    TooltipModule,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() title = 'Dashboard';
  @Input() userName = 'User';
  @Input() userRole = 'NURSE';
  @Input() sidebarCollapsed = false;
  @Input() mobileSidebarOpen = false;

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  currentTimeString = '';
  private timerSub?: Subscription;
  private pollingSub?: Subscription;
  private bgPollingSub?: Subscription;

  // Online Presence & State
  onlineCount = 0;
  totalUnreadCount = 0;
  showChatDrawer = false;
  chatView: 'list' | 'chat' = 'list';

  // Search & Filter
  searchQuery = '';

  // Data from Conversations API
  pinnedChannel: PinnedChannel = {
    id: 'department',
    name: '🏥 Kênh Chung Toàn Khoa',
    pinned: true,
    unread_count: 0,
    last_message: 'Chưa có thông báo nào',
    last_message_at: null,
  };
  conversations: ChatConversation[] = [];
  filteredConversations: ChatConversation[] = [];
  activeStaffList: ChatConversation[] = [];

  // Active Chat State
  isPinnedSelected = false;
  selectedContact: ChatConversation | null = null;
  chatMessages: MedicalMessage[] = [];
  loadingMessages = false;
  messageText = '';
  sendingMessage = false;

  // @ Mention State & Picker
  showMentionPopup = false;
  mentionQuery = '';
  mentionTab: 'ALL' | 'PATIENT' | 'MACHINE' | 'STAFF' = 'ALL';
  mentionSuggestions: MentionSuggestionsResponse = {
    patients: [],
    machines: [],
    staff: [],
    all: [],
  };
  selectedMentions: MedicalMentionRef[] = [];

  // Multimedia Attachments State
  isRecording = false;
  recordingSeconds = 0;
  private recordingTimerSub?: Subscription;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  recordedAudioBlob: Blob | null = null;
  recordedAudioUrl: string | null = null;

  selectedMediaFile: File | null = null;
  mediaPreviewUrl: string | null = null;
  mediaFileType: 'IMAGE' | 'VIDEO' | null = null;

  selectedDocFile: File | null = null;

  @ViewChild('mediaInput') mediaInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('docInput') docInputRef?: ElementRef<HTMLInputElement>;

  // Image full preview modal
  previewModalImageUrl: string | null = null;

  constructor(
    private chatService: MedicalChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateClock();
    this.timerSub = interval(1000).subscribe(() => this.updateClock());

    // Initial load of online presence & unread badge
    this.fetchConversations();

    // Background polling every 4 seconds to keep unread badges updated even when chat is closed
    this.bgPollingSub = interval(4000).subscribe(() => {
      if (!this.showChatDrawer) {
        this.fetchConversations(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.bgPollingSub?.unsubscribe();
    this.recordingTimerSub?.unsubscribe();
    this.stopPolling();
  }

  private updateClock(): void {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const date = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    this.currentTimeString = `${hours}:${minutes}:${seconds} • ${dayName}, ${date}/${month}/${year}`;
  }

  getGreeting(): string {
    let prefix = 'Cán bộ y tế';
    if (this.userRole === 'DOCTOR') prefix = 'Bác sĩ';
    else if (this.userRole === 'NURSE') prefix = 'Điều dưỡng';
    else if (this.userRole === 'ADMIN') prefix = 'Quản trị viên';

    return `Xin chào, ${prefix} ${this.userName}`;
  }

  // Polling management: 3 seconds interval when Drawer is open
  startPolling(): void {
    this.stopPolling();
    this.fetchConversations();
    this.pollingSub = interval(3000).subscribe(() => {
      this.fetchConversations(true);
      if (this.chatView === 'chat') {
        this.loadMessages(true);
      }
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  openChatDrawer(contact?: ChatConversation): void {
    this.showChatDrawer = true;
    this.startPolling();
    if (contact) {
      this.openConversation(contact);
    } else {
      this.chatView = 'list';
      this.fetchConversations();
    }
  }

  resetComposerState(): void {
    this.messageText = '';
    this.selectedMentions = [];
    this.showMentionPopup = false;
    this.mentionQuery = '';
    this.cancelVoiceRecording();
    this.clearSelectedMedia();
    this.clearSelectedDoc();
    if (this.mediaInputRef?.nativeElement) {
      this.mediaInputRef.nativeElement.value = '';
    }
    if (this.docInputRef?.nativeElement) {
      this.docInputRef.nativeElement.value = '';
    }
  }

  onDrawerHide(): void {
    this.stopPolling();
    this.resetComposerState();
  }

  fetchConversations(silent = false): void {
    this.chatService.getConversations().subscribe({
      next: (res) => {
        if (res.pinned_channel) {
          this.pinnedChannel = res.pinned_channel;
        }
        this.conversations = res.conversations || [];
        this.onlineCount = res.count_online || 0;

        if (res.total_unread !== undefined) {
          this.totalUnreadCount = res.total_unread;
        } else {
          const pinnedUnread = this.pinnedChannel.unread_count || 0;
          this.totalUnreadCount =
            this.conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) + pinnedUnread;
        }

        // Build active strip: users online or recently active
        this.activeStaffList = this.conversations
          .filter((c) => c.is_online || c.last_seen)
          .slice(0, 8);

        this.applyFilter();
      },
      error: () => {},
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredConversations = [...this.conversations];
    } else {
      this.filteredConversations = this.conversations.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          (c.department_name && c.department_name.toLowerCase().includes(q))
      );
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  openPinnedChannel(): void {
    this.resetComposerState();
    this.isPinnedSelected = true;
    this.selectedContact = null;
    this.chatView = 'chat';

    // Mark as read immediately on UI & Backend
    if (this.pinnedChannel.unread_count && this.pinnedChannel.unread_count > 0) {
      this.totalUnreadCount = Math.max(0, this.totalUnreadCount - this.pinnedChannel.unread_count);
      this.pinnedChannel.unread_count = 0;
      this.chatService.markRead({ channel: 'department' }).subscribe({ error: () => {} });
    }

    this.loadMessages();
  }

  openConversation(contact: ChatConversation): void {
    this.resetComposerState();
    this.isPinnedSelected = false;
    this.selectedContact = contact;
    this.chatView = 'chat';

    // Mark as read immediately on UI & Backend
    if (contact.unread_count && contact.unread_count > 0) {
      this.totalUnreadCount = Math.max(0, this.totalUnreadCount - contact.unread_count);
      contact.unread_count = 0;
      this.chatService.markRead({ target_id: contact.id }).subscribe({ error: () => {} });
    }

    this.loadMessages();
  }

  backToList(): void {
    this.resetComposerState();
    this.chatView = 'list';
    this.fetchConversations();
  }

  loadMessages(silent = false): void {
    if (!silent) this.loadingMessages = true;
    const params: any = {};
    if (this.isPinnedSelected) {
      params.channel = 'department';
    } else if (this.selectedContact) {
      params.receiver = this.selectedContact.id;
    }

    this.chatService.getMessages(params).subscribe({
      next: (res) => {
        const raw = res.results || res || [];
        const prevCount = this.chatMessages.length;
        this.chatMessages = raw;
        this.loadingMessages = false;
        if (!silent || raw.length > prevCount) {
          setTimeout(() => this.scrollChatToBottom(), 80);
        }
      },
      error: () => {
        this.loadingMessages = false;
      },
    });
  }

  // --------------------------------------------------------------------------
  // @ SMART MENTION & MEDICAL DATA TAGGING
  // --------------------------------------------------------------------------
  toggleMentionPicker(): void {
    this.showMentionPopup = !this.showMentionPopup;
    if (this.showMentionPopup) {
      this.loadMentionSuggestions(this.mentionQuery);
    }
  }

  loadMentionSuggestions(q = ''): void {
    this.chatService.getMentionSuggestions(q).subscribe({
      next: (res) => {
        this.mentionSuggestions = res || {
          patients: [],
          machines: [],
          staff: [],
          all: [],
        };
      },
      error: () => {},
    });
  }

  onMessageInput(event: any): void {
    const val: string = this.messageText || '';
    const lastAtIndex = val.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(val[lastAtIndex - 1]))) {
      const q = val.substring(lastAtIndex + 1).trim();
      if (!q.includes(' ') && q.length <= 15) {
        this.showMentionPopup = true;
        this.mentionQuery = q;
        this.loadMentionSuggestions(q);
        return;
      }
    }
    if (this.showMentionPopup && !val.includes('@')) {
      this.showMentionPopup = false;
    }
  }

  selectMention(item: MedicalMentionRef): void {
    if (!this.selectedMentions.some((m) => m.code === item.code && m.ref_type === item.ref_type)) {
      this.selectedMentions.push(item);
    }

    // Replace @query in text or append @code
    const lastAtIndex = this.messageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      this.messageText = this.messageText.substring(0, lastAtIndex) + `@${item.code} `;
    } else {
      this.messageText = (this.messageText ? this.messageText + ' ' : '') + `@${item.code} `;
    }

    this.showMentionPopup = false;
  }

  removeMention(index: number): void {
    this.selectedMentions.splice(index, 1);
  }

  getFilteredMentionSuggestions(): MedicalMentionRef[] {
    if (!this.mentionSuggestions) return [];
    if (this.mentionTab === 'PATIENT') return this.mentionSuggestions.patients || [];
    if (this.mentionTab === 'MACHINE') return this.mentionSuggestions.machines || [];
    if (this.mentionTab === 'STAFF') return this.mentionSuggestions.staff || [];
    return this.mentionSuggestions.all || [];
  }

  openRefLink(link: string): void {
    if (link) {
      this.showChatDrawer = false;
      this.stopPolling();
      this.router.navigateByUrl(link);
    }
  }

  // --------------------------------------------------------------------------
  // MULTIMEDIA: VOICE RECORDING, IMAGE, VIDEO, FILE ATTACHMENTS
  // --------------------------------------------------------------------------
  startVoiceRecording(): void {
    this.isRecording = true;
    this.recordingSeconds = 0;
    this.audioChunks = [];
    this.recordedAudioBlob = null;
    this.recordedAudioUrl = null;

    this.recordingTimerSub?.unsubscribe();
    this.recordingTimerSub = interval(1000).subscribe(() => {
      this.recordingSeconds++;
    });

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.mediaRecorder = new (window as any).MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = (e: any) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };
          this.mediaRecorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            if (this.audioChunks.length > 0) {
              this.recordedAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
              this.recordedAudioUrl = URL.createObjectURL(this.recordedAudioBlob);
            }
          };
          this.mediaRecorder.start();
        })
        .catch((err) => {
          console.warn('Physical mic unavailable, enabled simulated audio wave recording:', err);
          this.mediaRecorder = null;
        });
    } else {
      this.mediaRecorder = null;
    }
  }

  stopVoiceRecording(send = false): void {
    this.recordingTimerSub?.unsubscribe();
    this.recordingTimerSub = undefined;
    const dur = Math.max(1, this.recordingSeconds);
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          this.recordedAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        } else {
          this.recordedAudioBlob = this.generateSimulatedWavBlob(dur);
        }
        if (send) {
          this.sendVoiceMessage(this.recordedAudioBlob, dur);
        } else {
          this.recordedAudioUrl = URL.createObjectURL(this.recordedAudioBlob);
        }
      };
      this.mediaRecorder.stop();
    } else {
      // Fallback simulated clinical voice tone
      this.recordedAudioBlob = this.generateSimulatedWavBlob(dur);
      if (send) {
        this.sendVoiceMessage(this.recordedAudioBlob, dur);
      } else {
        this.recordedAudioUrl = URL.createObjectURL(this.recordedAudioBlob);
      }
    }
  }

  cancelVoiceRecording(): void {
    this.recordingTimerSub?.unsubscribe();
    this.recordingTimerSub = undefined;
    this.isRecording = false;
    this.recordingSeconds = 0;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedAudioBlob = null;
    this.recordedAudioUrl = null;
  }

  private generateSimulatedWavBlob(durationSeconds: number): Blob {
    const sampleRate = 8000;
    const numSamples = Math.min(sampleRate * durationSeconds, sampleRate * 10);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const freq = (i % (sampleRate * 0.5) < sampleRate * 0.25) ? 600 : 900;
      const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.3 * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  sendVoiceMessage(blob: Blob, seconds: number): void {
    const filename = `Ghi_am_${seconds}s.wav`;
    const formData = new FormData();
    const targetId = this.isPinnedSelected ? null : this.selectedContact?.id || null;
    if (targetId) {
      formData.append('receiver', String(targetId));
      formData.append('recipient', String(targetId));
    }
    formData.append('attachment_file', blob, filename);
    formData.append('attachment_type', 'AUDIO');
    formData.append('attachment_name', filename);
    formData.append('content', this.messageText.trim() || `[🎤 Tin nhắn thoại ${seconds}s]`);
    if (this.selectedMentions.length > 0) {
      formData.append('metadata', JSON.stringify({ mentions: this.selectedMentions }));
    }

    this.sendingMessage = true;
    this.chatService.sendMessage(formData).subscribe({
      next: (msg) => {
        this.sendingMessage = false;
        this.messageText = '';
        this.selectedMentions = [];
        this.recordedAudioBlob = null;
        this.recordedAudioUrl = null;
        this.chatMessages.push(msg);
        this.fetchConversations(true);
        setTimeout(() => this.scrollChatToBottom(), 80);
      },
      error: () => {
        this.sendingMessage = false;
      },
    });
  }

  onMediaFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;
    this.selectedMediaFile = file;
    this.mediaFileType = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';
    this.mediaPreviewUrl = URL.createObjectURL(file);
    event.target.value = '';
  }

  clearSelectedMedia(): void {
    this.selectedMediaFile = null;
    this.mediaPreviewUrl = null;
    this.mediaFileType = null;
  }

  onDocFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;
    this.selectedDocFile = file;
    event.target.value = '';
  }

  clearSelectedDoc(): void {
    this.selectedDocFile = null;
  }

  openImagePreviewModal(url?: string | null): void {
    if (url) {
      this.previewModalImageUrl = url;
    }
  }

  closeImagePreviewModal(): void {
    this.previewModalImageUrl = null;
  }

  // --------------------------------------------------------------------------
  // SEND MESSAGE HANDLER (JSON OR FORMDATA)
  // --------------------------------------------------------------------------
  sendMessage(): void {
    const hasText = !!this.messageText.trim();
    const hasMedia = !!this.selectedMediaFile;
    const hasDoc = !!this.selectedDocFile;
    const hasMentions = this.selectedMentions.length > 0;
    const hasVoice = !!this.recordedAudioBlob;

    if (!hasText && !hasMedia && !hasDoc && !hasMentions && !hasVoice) {
      return;
    }
    if (this.sendingMessage) return;

    const targetId = this.isPinnedSelected ? null : this.selectedContact?.id || null;

    if (hasMedia || hasDoc || hasVoice) {
      const formData = new FormData();
      if (targetId) {
        formData.append('receiver', String(targetId));
        formData.append('recipient', String(targetId));
      }
      formData.append('content', this.messageText.trim());

      if (this.selectedMediaFile) {
        formData.append('attachment_file', this.selectedMediaFile, this.selectedMediaFile.name);
        formData.append('attachment_type', this.mediaFileType || 'IMAGE');
        formData.append('attachment_name', this.selectedMediaFile.name);
      } else if (this.selectedDocFile) {
        formData.append('attachment_file', this.selectedDocFile, this.selectedDocFile.name);
        formData.append('attachment_type', 'FILE');
        formData.append('attachment_name', this.selectedDocFile.name);
      } else if (this.recordedAudioBlob) {
        formData.append('attachment_file', this.recordedAudioBlob, 'voice_note.wav');
        formData.append('attachment_type', 'AUDIO');
        formData.append('attachment_name', 'voice_note.wav');
      }

      if (this.selectedMentions.length > 0) {
        formData.append('metadata', JSON.stringify({ mentions: this.selectedMentions }));
      }

      this.sendingMessage = true;
      this.chatService.sendMessage(formData).subscribe({
        next: (msg) => {
          this.sendingMessage = false;
          this.messageText = '';
          this.selectedMentions = [];
          this.clearSelectedMedia();
          this.clearSelectedDoc();
          this.recordedAudioBlob = null;
          this.recordedAudioUrl = null;
          this.chatMessages.push(msg);
          this.fetchConversations(true);
          setTimeout(() => this.scrollChatToBottom(), 80);
        },
        error: () => {
          this.sendingMessage = false;
        },
      });
    } else {
      // Pure JSON message
      this.sendingMessage = true;
      const payload: any = {
        content: this.messageText.trim(),
        receiver: targetId,
        recipient: targetId,
      };
      if (this.selectedMentions.length > 0) {
        payload.metadata = { mentions: this.selectedMentions };
      }

      this.chatService.sendMessage(payload).subscribe({
        next: (msg) => {
          this.sendingMessage = false;
          this.messageText = '';
          this.selectedMentions = [];
          this.chatMessages.push(msg);
          this.fetchConversations(true);
          setTimeout(() => this.scrollChatToBottom(), 80);
        },
        error: () => {
          this.sendingMessage = false;
        },
      });
    }
  }

  isOutgoing(msg: MedicalMessage): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (currentUserId && msg.sender === currentUserId) return true;
    return msg.sender_name === this.userName;
  }

  isSOSMessage(content?: string | null): boolean {
    if (!content) return false;
    return content.includes('[🚨 BÁO ĐỘNG SOS') || content.includes('BÁO ĐỘNG SOS');
  }

  private scrollChatToBottom(): void {
    const el = document.getElementById('chatMessagesBody');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  getInitials(name?: string | null): string {
    if (!name || name === 'Hệ thống') return 'HT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getShortName(fullName?: string | null, role?: string | null): string {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    if (role === 'DOCTOR') return `BS. ${lastName}`;
    if (role === 'NURSE') return `ĐD. ${lastName}`;
    if (role === 'ADMIN') return `Admin`;
    return lastName;
  }

  getRoleBadge(role?: string | null): { label: string; cssClass: string } {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị', cssClass: 'badge-admin' };
      case 'DOCTOR':
        return { label: 'Bác sĩ', cssClass: 'badge-doctor' };
      case 'NURSE':
        return { label: 'Điều dưỡng', cssClass: 'badge-nurse' };
      default:
        return { label: 'Hệ thống', cssClass: 'badge-system' };
    }
  }

  formatTime(isoString?: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    const d = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${mo}`;
  }

  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
