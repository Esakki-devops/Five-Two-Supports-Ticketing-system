import {
  BarChart3,
  Bell,
  Building2,
  LayoutDashboard,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** When set, only these roles see the item. */
  roles?: Role[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Tickets', to: '/tickets', icon: Ticket },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Users', to: '/admin/users', icon: Users, roles: [Role.Engineer] },
  { label: 'Departments', to: '/admin/departments', icon: Building2, roles: [Role.Engineer] },
  { label: 'Categories', to: '/admin/categories', icon: Tags, roles: [Role.Engineer] },
  { label: 'Reports', to: '/reports', icon: BarChart3, roles: [Role.Engineer] },
];

export function navItemsForRole(role: Role | undefined): NavItem[] {
  return navItems.filter(
    (item) => !item.roles || (role !== undefined && item.roles.includes(role)),
  );
}
