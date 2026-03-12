'use client';

import { useAuthStore, useSidebarStore } from '@/lib/store';
import { Bell, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-all duration-300',
        isCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search devices, fleets..."
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-500" />
        </button>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{user?.role || 'Admin'}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="h-5 w-5 text-primary-600" />
          </div>
        </div>
      </div>
    </header>
  );
}

