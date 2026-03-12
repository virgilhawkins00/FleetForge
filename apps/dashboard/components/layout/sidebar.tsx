'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/lib/store';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Rocket,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/dashboard/devices', icon: Cpu },
  { name: 'Fleets', href: '/dashboard/fleets', icon: Layers },
  { name: 'Deployments', href: '/dashboard/deployments', icon: Rocket },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gray-900 text-white transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold">F</span>
              </div>
              <span className="text-xl font-bold">FleetForge</span>
            </Link>
          )}
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 hover:bg-gray-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-2">
          <button
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
            {!isCollapsed && 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  );
}

