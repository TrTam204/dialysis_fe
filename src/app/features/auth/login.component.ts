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
import { RevealDirective } from '../landing/reveal.directive';

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
    RevealDirective
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form;
  loading = false;
  shakeError = false;
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
      this.triggerShake();
      return;
    }

    this.loading = true;
    this.form.disable();
    this.messages = [];

    const credentials: LoginRequest = {
      username: this.form.value.username || '',
      password: this.form.value.password || '',
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        this.form.enable();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.form.enable();
        const detail = err?.error?.detail || err?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        this.messages = [{ severity: 'error', summary: 'Lỗi đăng nhập', detail }];
        this.triggerShake();
      },
    });
  }
  
  private triggerShake() {
    this.shakeError = false;
    setTimeout(() => {
      this.shakeError = true;
      setTimeout(() => {
        this.shakeError = false;
      }, 500); // 500ms shake duration
    }, 10);
  }
}
