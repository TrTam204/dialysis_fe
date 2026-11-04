import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessagesModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  step: 'EMAIL' | 'OTP_RESET' = 'EMAIL';
  emailForm: FormGroup;
  resetForm: FormGroup;
  loading = false;
  messages: { severity: string; summary: string; detail: string }[] = [];
  simulatedOtp: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  sendOtp() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = this.emailForm.value.email;
    this.loading = true;
    this.messages = [];

    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 'OTP_RESET';
        if (res?.otp) {
          this.simulatedOtp = res.otp;
        }
        this.messages = [
          {
            severity: 'success',
            summary: 'Đã gửi mã OTP',
            detail: res?.detail || 'Vui lòng kiểm tra email của bạn để lấy mã OTP đặt lại mật khẩu.',
          },
        ];
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
        this.messages = [{ severity: 'error', summary: 'Lỗi', detail }];
      },
    });
  }

  resetPassword() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { otp, password, confirmPassword } = this.resetForm.value;
    if (password !== confirmPassword) {
      this.messages = [
        {
          severity: 'error',
          summary: 'Mật khẩu không khớp',
          detail: 'Mật khẩu mới và xác nhận mật khẩu phải giống nhau.',
        },
      ];
      return;
    }

    const email = this.emailForm.value.email;
    this.loading = true;
    this.messages = [];

    this.authService.resetPassword(email, otp, password).subscribe({
      next: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.',
        });
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail || 'Đặt lại mật khẩu thất bại. Mã OTP có thể đã hết hạn.';
        this.messages = [{ severity: 'error', summary: 'Lỗi', detail }];
      },
    });
  }
}
