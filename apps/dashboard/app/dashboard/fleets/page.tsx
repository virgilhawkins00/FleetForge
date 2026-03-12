'use client';

import { useState } from 'react';
import { Plus, Layers, MoreVertical } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';

const mockFleets = [
  { id: '1', name: 'Production Fleet A', description: 'Main production devices', deviceCount: 523, onlineCount: 498, status: 'active' },
  { id: '2', name: 'Production Fleet B', description: 'Secondary production', deviceCount: 312, onlineCount: 289, status: 'active' },
  { id: '3', name: 'Staging Fleet', description: 'Pre-production testing', deviceCount: 87, onlineCount: 72, status: 'active' },
  { id: '4', name: 'Development', description: 'Development and testing', deviceCount: 45, onlineCount: 38, status: 'active' },
  { id: '5', name: 'Legacy Devices', description: 'Older device fleet', deviceCount: 280, onlineCount: 192, status: 'maintenance' },
];

export default function FleetsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleets</h1>
          <p className="text-gray-500">Organize and manage device fleets</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Fleet
        </Button>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockFleets.map((fleet) => (
          <Card key={fleet.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-primary-100 p-2">
                  <Layers className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{fleet.name}</CardTitle>
                  <p className="text-sm text-gray-500">{fleet.description}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{fleet.deviceCount}</p>
                  <p className="text-sm text-gray-500">Total devices</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-success-500" />
                    <span className="text-sm font-medium text-gray-900">{fleet.onlineCount} online</span>
                  </div>
                  <Badge variant={fleet.status === 'active' ? 'success' : 'warning'}>
                    {fleet.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-success-500"
                    style={{ width: `${(fleet.onlineCount / fleet.deviceCount) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {Math.round((fleet.onlineCount / fleet.deviceCount) * 100)}% online
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

