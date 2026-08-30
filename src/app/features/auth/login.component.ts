import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessagesModule } from 'primeng/messages';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    MessagesModule,
  ],
  template: `
    <div class="auth-shell">
      <p-card header="Đăng nhập hệ thống" subheader="Trung tâm Lọc máu">
        <p-messages [(value)]="messages" [enableService]="false" [closable]="true" />

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="username">Tên đăng nhập</label>
            <input id="username" pInputText formControlName="username" [disabled]="loading" />
            <small class="p-error" *ngIf="form.get('username')?.invalid && form.get('username')?.touched">
              Tên đăng nhập không được rỗng
            </small>
          </div>

          <div class="field">
            <label for="password">Mật khẩu</label>
            <p-password formControlName="password" [feedback]="false" [toggleMask]="true" [disabled]="loading" />
            <small class="p-error" *ngIf="form.get('password')?.invalid && form.get('password')?.touched">
              Mật khẩu không được rỗng
            </small>
          </div>

          <button pButton type="submit" label="Đăng nhập" class="w-full" [loading]="loading" [disabled]="loading"></button>
        </form>

        <div class="auth-footer">
          <a routerLink="/auth/forgot-password">Quên mật khẩu?</a>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    '.auth-shell { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 24px; }',
    'p-card { width: min(420px, 100%); }',
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }',
    'label { font-weight: 600; }',
    '.p-error { color: #f87171; font-size: 0.875rem; }',
    '.auth-footer { margin-top: 16px; text-align: center; }',
    '.auth-footer a { color: #3b82f6; text-decoration: none; font-size: 0.875rem; }',
    '.auth-footer a:hover { text-decoration: underline; }',
  ],
})
export class LoginComponent {
  form;
  loading = false;
  messages: { severity: string; summary: string; detail: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.messages = [];

    const credentials: LoginRequest = {
      username: this.form.value.username || '',
      password: this.form.value.password || '',
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail || err?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        this.messages = [{ severity: 'error', summary: 'Lỗi đăng nhập', detail }];
      },
    });
  }
}
