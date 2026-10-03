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

  readonly navGroups: NavGroup[] = [
    {
      label: 'Tổng quan',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: 'pi pi-chart-bar' },
        { label: 'Báo cáo', route: '/reports', icon: 'pi pi-chart-line' },
      ],
    },
    {
      label: 'Vận hành',
      items: [
        { label: 'Bệnh nhân', route: '/patients', icon: 'pi pi-user' },
        { label: 'Kế hoạch tuần', route: '/schedule-plans', icon: 'pi pi-calendar-plus' },
        { label: 'Lịch lọc', route: '/schedule', icon: 'pi pi-calendar' },
        { label: 'Phiên lọc', route: '/sessions', icon: 'pi pi-clock' },
      ],
    },
    {
      label: 'Quản lý',
      items: [
        { label: 'Nhân sự', route: '/staff', icon: 'pi pi-users' },
        { label: 'Máy lọc', route: '/machines', icon: 'pi pi-cog' },
        { label: 'Khoa / Phòng ban', route: '/departments', icon: 'pi pi-building' },
        { label: 'Mẫu xét nghiệm', route: '/blood-samples', icon: 'pi pi-clipboard' },
        { label: 'Nhật ký hệ thống', route: '/audit-logs', icon: 'pi pi-history', roles: ['ADMIN'] },
      ],
    },
  ];

  isItemVisible(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.includes(this.currentUserRole);
  }

  isGroupVisible(group: NavGroup): boolean {
    return group.items.some((item) => this.isItemVisible(item));
  }

  onNavigate(): void {
    this.itemSelected.emit();
  }
}
