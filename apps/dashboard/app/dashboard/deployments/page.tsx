'use client';

import { useState } from 'react';
import { Plus, Rocket, Play, Pause, RotateCcw, MoreVertical } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';

const mockDeployments = [
  { id: '1', firmwareVersion: 'v2.4.1', fleetName: 'Production Fleet A', status: 'running', progress: 67, targetDevices: 523, completedDevices: 350, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: '2', firmwareVersion: 'v2.4.1', fleetName: 'Production Fleet B', status: 'pending', progress: 0, targetDevices: 312, completedDevices: 0, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: '3', firmwareVersion: 'v2.4.0', fleetName: 'Staging Fleet', status: 'completed', progress: 100, targetDevices: 87, completedDevices: 87, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '4', firmwareVersion: 'v2.3.9', fleetName: 'Development', status: 'paused', progress: 45, targetDevices: 45, completedDevices: 20, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: '5', firmwareVersion: 'v2.3.8', fleetName: 'Legacy Devices', status: 'failed', progress: 23, targetDevices: 280, completedDevices: 65, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    completed: 'success',
    running: 'info',
    pending: 'warning',
    failed: 'danger',
    paused: 'warning',
  };
  return variants[status] || 'default';
};

export default function DeploymentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-500">Manage firmware deployments across your fleets</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Deployment
        </Button>
      </div>

      {/* Deployments List */}
      <div className="space-y-4">
        {mockDeployments.map((deployment) => (
          <Card key={deployment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="rounded-lg bg-primary-100 p-3">
                    <Rocket className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{deployment.firmwareVersion}</h3>
                      <Badge variant={statusVariant(deployment.status)}>{deployment.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{deployment.fleetName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {deployment.status === 'paused' && (
                    <Button variant="ghost" size="sm"><Play className="h-4 w-4" /></Button>
                  )}
                  {deployment.status === 'running' && (
                    <Button variant="ghost" size="sm"><Pause className="h-4 w-4" /></Button>
                  )}
                  {deployment.status === 'failed' && (
                    <Button variant="ghost" size="sm"><RotateCcw className="h-4 w-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{deployment.completedDevices} / {deployment.targetDevices} devices</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${deployment.status === 'failed' ? 'bg-danger-500' : 'bg-primary-500'}`}
                    style={{ width: `${deployment.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Started {formatRelativeTime(deployment.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

