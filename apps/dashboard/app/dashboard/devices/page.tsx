'use client';

import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';

// Mock data
const mockDevices = [
  {
    id: '1',
    name: 'Gateway-001',
    type: 'gateway',
    status: 'online',
    fleetName: 'Production',
    lastSeen: new Date().toISOString(),
    firmwareVersion: 'v2.4.1',
  },
  {
    id: '2',
    name: 'Sensor-042',
    type: 'sensor',
    status: 'online',
    fleetName: 'Production',
    lastSeen: new Date().toISOString(),
    firmwareVersion: 'v2.4.0',
  },
  {
    id: '3',
    name: 'Gateway-015',
    type: 'gateway',
    status: 'offline',
    fleetName: 'Staging',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    firmwareVersion: 'v2.3.9',
  },
  {
    id: '4',
    name: 'Edge-Node-003',
    type: 'edge',
    status: 'maintenance',
    fleetName: 'Development',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    firmwareVersion: 'v2.4.1',
  },
  {
    id: '5',
    name: 'Sensor-089',
    type: 'sensor',
    status: 'online',
    fleetName: 'Production',
    lastSeen: new Date().toISOString(),
    firmwareVersion: 'v2.4.1',
  },
];

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    online: 'success',
    offline: 'danger',
    maintenance: 'warning',
  };
  return variants[status] || 'default';
};

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const devices = mockDevices.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500">Manage and monitor your IoT devices</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search devices..."
                value={search}
                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fleet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firmware
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{device.name}</div>
                    <div className="text-sm text-gray-500">{device.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {device.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={statusVariant(device.status)}>{device.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.fleetName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.firmwareVersion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRelativeTime(device.lastSeen)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
