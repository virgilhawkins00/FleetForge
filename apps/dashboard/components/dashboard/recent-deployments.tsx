'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';

interface Deployment {
  id: string;
  firmwareVersion: string;
  fleetName: string;
  status: string;
  progress: number;
  createdAt: string;
}

interface RecentDeploymentsProps {
  deployments: Deployment[];
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    completed: 'success',
    running: 'info',
    pending: 'warning',
    failed: 'danger',
    paused: 'warning',
  };
  return variants[status.toLowerCase()] || 'default';
};

export function RecentDeployments({ deployments }: RecentDeploymentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Deployments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deployments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No recent deployments</p>
          ) : (
            deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{deployment.firmwareVersion}</p>
                  <p className="text-sm text-gray-500">{deployment.fleetName}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={statusVariant(deployment.status)}>
                    {deployment.status}
                  </Badge>
                  <p className="text-xs text-gray-400">{formatRelativeTime(deployment.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

