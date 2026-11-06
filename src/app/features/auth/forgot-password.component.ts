import { Component, OnDestroy } from '@angular/core';
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
export class ForgotPasswordComponent implements OnDestroy {
  step: 'EMAIL' | 'OTP_RESET' = 'EMAIL';
  emailForm: FormGroup;
  resetForm: FormGroup;
  loading = false;
  messages: { severity: string; summary: string; detail: string }[] = [];
  simulatedOtp: string | null = null;
  currentEmail = '';

  // 5-Minute OTP Timer
  countdownSeconds = 300;
  countdownDisplay = '05:00';
  private timerInterval: any = null;
  canResend = false;

  readonly demoAccounts = [
    { label: 'Admin (Gmail thật)', email: 'admin.ttam.dialysis@gmail.com', role: 'Quản trị viên' },
    { label: 'Bác sĩ An', email: 'doctor1@dialysis.local', role: 'Bác sĩ điều trị' },
    { label: 'Điều dưỡng Mai', email: 'nurse1@dialysis.local', role: 'Điều dưỡng' },
  ];

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
      otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  fillEmail(email: string): void {
    this.emailForm.patchValue({ email });
    this.messages = [];
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownSeconds = 300;
    this.canResend = false;
    this.updateCountdownDisplay();

    this.timerInterval = setInterval(() => {
      this.countdownSeconds--;
      this.updateCountdownDisplay();
      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        this.canResend = true;
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateCountdownDisplay(): void {
    const mins = Math.floor(this.countdownSeconds / 60);
    const secs = this.countdownSeconds % 60;
    this.countdownDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  sendOtp(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = this.emailForm.value.email.trim();
    this.currentEmail = email;
    this.loading = true;
    this.messages = [];

    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 'OTP_RESET';
        this.startCountdown();
        if (res?.otp) {
          this.simulatedOtp = res.otp;
        }
        this.messages = [
          {
            severity: 'success',
            summary: 'Đã gửi mã OTP',
            detail: res?.detail || `Đã gửi mã xác thực 6 chữ số tới ${email}. Vui lòng kiểm tra hộp thư.`,
          },
        ];
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại email hoặc liên hệ Quản trị viên.';
        this.messages = [{ severity: 'error', summary: 'Không tìm thấy tài khoản', detail }];
      },
    });
  }

  resendOtp(): void {
    if (!this.canResend && this.countdownSeconds > 0) return;
    this.sendOtp();
  }

  backToEmailStep(): void {
    this.step = 'EMAIL';
    this.stopCountdown();
    this.messages = [];
    this.resetForm.reset();
  }

  resetPassword(): void {
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
          detail: 'Mật khẩu mới và xác nhận mật khẩu phải hoàn toàn trùng khớp.',
        },
      ];
      return;
    }

    this.loading = true;
    this.messages = [];

    this.authService.resetPassword(this.currentEmail, otp.trim(), password).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.stopCountdown();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: res?.detail || 'Đặt lại mật khẩu thành công! Tài khoản đã được mở khóa an toàn.',
        });
        setTimeout(() => {
          this.router.navigate(['/auth/login'], { queryParams: { resetSuccess: '1' } });
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.detail || 'Đặt lại mật khẩu thất bại. Mã OTP không đúng hoặc đã hết hạn.';
        this.messages = [{ severity: 'error', summary: 'Xác thực thất bại', detail }];
      },
    });
  }
}
