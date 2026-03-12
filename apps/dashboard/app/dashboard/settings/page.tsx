'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="current-password"
            type="password"
            label="Current Password"
            placeholder="••••••••"
          />
          <Input
            id="new-password"
            type="password"
            label="New Password"
            placeholder="••••••••"
          />
          <Input
            id="confirm-password"
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
          />
          <Button>Update Password</Button>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Configure API endpoints and keys</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="api-url"
            label="API URL"
            value={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100'}
            disabled
          />
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="font-medium text-gray-900">API Key</p>
              <p className="text-sm text-gray-500">Your API key for programmatic access</p>
            </div>
            <Button variant="outline">Generate New Key</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger-200">
        <CardHeader>
          <CardTitle className="text-danger-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="danger">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

