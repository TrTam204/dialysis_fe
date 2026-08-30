import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarModule } from 'primeng/sidebar';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarModule, ButtonModule, ToastModule],
  template: `
    <p-toast position="top-right"></p-toast>
    <div class="layout-shell">
      <aside class="sidebar">
        <h3>Dialysis Center</h3>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">📊 Dashboard</a>

          <div class="nav-section">
            <div class="nav-title">Quản lý</div>
            <a routerLink="/patients" routerLinkActive="active">👤 Bệnh nhân</a>
            <a routerLink="/staff" routerLinkActive="active">👨‍⚕️ Nhân sự</a>
            <a routerLink="/departments" routerLinkActive="active">🏥 Khoa/Phòng ban</a>
            <a routerLink="/machines" routerLinkActive="active">🔧 Máy lọc</a>
            <a routerLink="/sessions" routerLinkActive="active">⏱️ Phiên lọc</a>
            <a routerLink="/blood-samples" routerLinkActive="active">🩸 Mẫu xét nghiệm</a>
          </div>

          <a (click)="logout()" class="logout-link">🚪 Đăng xuất</a>
        </nav>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <button pButton icon="pi pi-bars" class="p-button-text"></button>
          <div class="user-box">{{ currentUserName }}</div>
        </header>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .layout-shell {
        display: flex;
        min-height: 100vh;
      }
      .sidebar {
        width: 240px;
        background: #0f172a;
        color: white;
        padding: 24px 16px;
        overflow-y: auto;
      }
      .sidebar h3 {
        margin: 0 0 24px 0;
        font-size: 1.25rem;
      }
      .sidebar nav {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .sidebar a {
        color: #e2e8f0;
        text-decoration: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
      }
      .sidebar a:hover {
        background: #1e293b;
        color: white;
      }
      .sidebar a.active {
        background: #3b82f6;
        color: white;
      }
      .nav-section {
        margin-top: 12px;
      }
      .nav-title {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #94a3b8;
        padding: 8px 12px;
        margin-top: 8px;
        margin-bottom: 4px;
      }
      .logout-link {
        margin-top: 24px;
        color: #f87171;
      }
      .logout-link:hover {
        background: #7f1d1d;
        color: #fca5a5;
      }
      .main-panel {
        flex: 1;
        background: #f8fafc;
        overflow-y: auto;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .user-box {
        font-weight: 600;
      }
    `,
  ],
})
export class MainLayoutComponent implements OnInit {
  currentUserName = 'User';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserName = user.username;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
