import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule],
  template: `
    <div class="auth-shell">
      <p-card header="Quên mật khẩu" subheader="Nhập email để nhận mã OTP">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" pInputText formControlName="email" />
          </div>

          <button pButton type="submit" label="Gửi OTP" class="w-full"></button>
        </form>
      </p-card>
    </div>
  `,
  styles: [
    '.auth-shell { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 24px; }',
    'p-card { width: min(420px, 100%); }',
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }',
    'label { font-weight: 600; }',
  ],
})
export class ForgotPasswordComponent {
  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    if (this.form.valid) {
      console.log('Forgot password request', this.form.value);
    }
  }
}
