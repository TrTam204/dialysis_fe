import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() currentUserName = 'User';
  @Input() currentUserRole = 'NURSE';

  @Output() itemSelected = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  readonly navGroups: NavGroup[] = [
    {
      label: 'Tổng quan',
      items: [
        { label: 'Bảng điều khiển', route: '/dashboard', icon: 'pi pi-chart-bar' },
        { label: 'Báo cáo', route: '/reports', icon: 'pi pi-chart-line', roles: ['ADMIN', 'DOCTOR'] },
      ],
    },
    {
      label: 'Vận hành',
      items: [
        { label: 'Phiên lọc máu', route: '/sessions', icon: 'pi pi-clock' },
        { label: 'Lịch lọc máu', route: '/schedule', icon: 'pi pi-calendar' },
        { label: 'Bệnh nhân', route: '/patients', icon: 'pi pi-user' },
        { label: 'Máy lọc máu', route: '/machines', icon: 'pi pi-cog' },
        { label: 'Kế hoạch tuần', route: '/schedule-plans', icon: 'pi pi-calendar-plus', roles: ['ADMIN', 'DOCTOR'] },
      ],
    },
    {
      label: 'Hỗ trợ quyết định',
      items: [
        { label: 'Phân tầng TOPSIS', route: '/topsis', icon: 'pi pi-sort-amount-down', roles: ['ADMIN', 'DOCTOR'] },
        { label: 'Phân cụm bệnh nhân (K-Means)', route: '/clustering', icon: 'pi pi-chart-scatter', roles: ['ADMIN', 'DOCTOR'] },
      ],
    },
    {
      label: 'Quản trị',
      items: [
        { label: 'Mẫu xét nghiệm', route: '/blood-samples', icon: 'pi pi-clipboard', roles: ['ADMIN', 'DOCTOR'] },
        { label: 'Nhân sự', route: '/staff', icon: 'pi pi-users', roles: ['ADMIN'] },
        { label: 'Khoa / Phòng ban', route: '/departments', icon: 'pi pi-building', roles: ['ADMIN'] },
        { label: 'Nhật ký hệ thống', route: '/audit-logs', icon: 'pi pi-history', roles: ['ADMIN'] },
      ],
    },
  ];

  isItemVisible(item: NavItem): boolean {
    // Nurse-focused view: only 3 core operational items
    if (this.currentUserRole === 'NURSE') {
      return ['/sessions', '/schedule', '/patients'].includes(item.route);
    }

    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.includes(this.currentUserRole);
  }

  getItemLabel(item: NavItem): string {
    if (this.currentUserRole === 'NURSE') {
      if (item.route === '/sessions') return 'Phiên lọc hôm nay';
      if (item.route === '/schedule') return 'Lịch làm việc tuần';
      if (item.route === '/patients') return 'Hồ sơ bệnh nhân';
    }
    return item.label;
  }

  getGroupLabel(group: NavGroup): string {
    if (this.currentUserRole === 'NURSE') {
      return 'Ca trực lâm sàng';
    }
    return group.label;
  }

  isGroupVisible(group: NavGroup): boolean {
    return group.items.some((item) => this.isItemVisible(item));
  }

  onNavigate(): void {
    this.itemSelected.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
