import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { TopbarComponent } from '../components/topbar/topbar.component';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Bệnh nhân',
  '/sessions': 'Phiên lọc',
  '/staff': 'Nhân sự',
  '/machines': 'Máy lọc',
  '/departments': 'Khoa / Phòng ban',
  '/blood-samples': 'Mẫu xét nghiệm',
};

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
      .pipe(filter((event) => event.constructor.name === 'NavigationEnd'))
      .subscribe(() => {
        this.updateRouteTitle(this.router.url);
        this.closeSidebar();
      });
  }

  private updateRouteTitle(url: string): void {
    const normalizedUrl = url.split('?')[0].split('#')[0];
    this.routeTitle = ROUTE_TITLES[normalizedUrl] || ROUTE_TITLES['/dashboard'];
  }

  toggleSidebar(): void {
    const isMobile = window.innerWidth <= 960;

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
