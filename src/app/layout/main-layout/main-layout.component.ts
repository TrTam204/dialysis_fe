import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { TopbarComponent } from '../components/topbar/topbar.component';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reports': 'Báo cáo vận hành',
  '/schedule': 'Lịch lọc máu',
  '/schedule-plans': 'Kế hoạch lọc máu tuần',
  '/topsis': 'Phân loại TOPSIS',
  '/patients': 'Bệnh nhân',
  '/sessions': 'Phiên lọc',
  '/staff': 'Nhân sự',
  '/machines': 'Máy lọc',
  '/departments': 'Khoa / Phòng ban',
  '/blood-samples': 'Mẫu xét nghiệm',
  '/audit-logs': 'Nhật ký hệ thống',
};

const DYNAMIC_ROUTE_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/schedule-plans\/\d+$/, title: 'Chi tiết kế hoạch tuần' },
  { pattern: /^\/patients\/new$/, title: 'Thêm mới bệnh nhân' },
  { pattern: /^\/patients\/[^/]+$/, title: 'Hồ sơ bệnh nhân' },
  { pattern: /^\/patients\/[^/]+\/edit$/, title: 'Chỉnh sửa bệnh nhân' },
  { pattern: /^\/sessions\/new$/, title: 'Tạo mới phiên lọc' },
  { pattern: /^\/sessions\/[^/]+$/, title: 'Chi tiết phiên lọc' },
  { pattern: /^\/sessions\/[^/]+\/edit$/, title: 'Chỉnh sửa phiên lọc' },
  { pattern: /^\/departments\/new$/, title: 'Thêm mới khoa / phòng' },
  { pattern: /^\/departments\/\d+\/edit$/, title: 'Chỉnh sửa khoa / phòng' },
  { pattern: /^\/staff\/new$/, title: 'Thêm mới nhân sự' },
  { pattern: /^\/staff\/\d+\/edit$/, title: 'Chỉnh sửa nhân sự' },
  { pattern: /^\/machines\/new$/, title: 'Thêm mới máy lọc' },
  { pattern: /^\/machines\/[^/]+\/edit$/, title: 'Chỉnh sửa máy lọc' },
  { pattern: /^\/blood-samples\/new$/, title: 'Thêm mới mẫu xét nghiệm' },
  { pattern: /^\/blood-samples\/[^/]+\/edit$/, title: 'Chỉnh sửa mẫu xét nghiệm' },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastModule, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  currentUserName = 'User';
  currentUserRole = 'NURSE';
  routeTitle = 'Dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserName = user.username || 'User';
      this.currentUserRole = user.role || 'NURSE';
    }

    this.updateRouteTitle(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateRouteTitle(event.urlAfterRedirects || this.router.url);
        this.closeSidebar();
      });
  }

  private updateRouteTitle(url: string): void {
    const normalizedUrl = url.split('?')[0].split('#')[0];

    const directTitle = ROUTE_TITLES[normalizedUrl];
    if (directTitle) {
      this.routeTitle = directTitle;
      return;
    }

    const matchedDynamicRoute = DYNAMIC_ROUTE_TITLES.find(({ pattern }) => pattern.test(normalizedUrl));
    this.routeTitle = matchedDynamicRoute?.title || ROUTE_TITLES['/dashboard'];
  }

  toggleSidebar(): void {
    const isMobile = window.innerWidth <= 991;

    if (isMobile) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
      return;
    }

    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  closeSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
