import { Command } from 'commander';
import { apiGet, apiPost, apiPatch, apiDelete } from '../api/client';
import { success, error, table, json, spinner, formatStatus, formatDate } from '../utils/output';

interface Device {
  id: string;
  name: string;
  status: string;
  fleetId?: string;
  firmwareVersion?: string;
  lastSeen?: string;
  createdAt: string;
}

interface DeviceList {
  devices: Device[];
  total: number;
}

export function registerDevicesCommand(program: Command): void {
  const devices = program.command('devices').description('Device management commands');

  // List devices
  devices
    .command('list')
    .description('List all devices')
    .option('--fleet <id>', 'Filter by fleet ID')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .option('--limit <n>', 'Limit results', '50')
    .action(async (options) => {
      try {
        const spin = spinner('Fetching devices...');
        const params = new URLSearchParams();
        if (options.fleet) params.append('fleetId', options.fleet);
        if (options.status) params.append('status', options.status);
        params.append('limit', options.limit);

        const data = await apiGet<DeviceList>(`/api/devices?${params}`);
        spin.stop();

        if (options.json) {
          json(data);
          return;
        }

        if (data.devices.length === 0) {
          success('No devices found');
          return;
        }

        table(
          ['ID', 'Name', 'Status', 'Fleet', 'Firmware', 'Last Seen'],
          data.devices.map((d) => [
            d.id.substring(0, 8),
            d.name,
            formatStatus(d.status),
            d.fleetId || '-',
            d.firmwareVersion || '-',
            d.lastSeen ? formatDate(d.lastSeen) : '-',
          ])
        );
        success(`Total: ${data.total} devices`);
      } catch (err) {
        error(`Failed to list devices: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get device
  devices
    .command('get <id>')
    .description('Get device details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const spin = spinner('Fetching device...');
        const device = await apiGet<Device>(`/api/devices/${id}`);
        spin.stop();

        if (options.json) {
          json(device);
          return;
        }

        console.log(`\nDevice: ${device.name}`);
        console.log(`  ID:       ${device.id}`);
        console.log(`  Status:   ${formatStatus(device.status)}`);
        console.log(`  Fleet:    ${device.fleetId || 'None'}`);
        console.log(`  Firmware: ${device.firmwareVersion || 'Unknown'}`);
        console.log(`  Created:  ${formatDate(device.createdAt)}`);
        console.log(`  Last Seen: ${device.lastSeen ? formatDate(device.lastSeen) : 'Never'}`);
      } catch (err) {
        error(`Failed to get device: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Create device
  devices
    .command('create')
    .description('Create a new device')
    .requiredOption('--name <name>', 'Device name')
    .option('--fleet <id>', 'Fleet ID')
    .option('--metadata <json>', 'Device metadata as JSON')
    .action(async (options) => {
      try {
        const spin = spinner('Creating device...');
        const metadata = options.metadata ? JSON.parse(options.metadata) : {};
        const device = await apiPost<Device>('/api/devices', {
          name: options.name,
          fleetId: options.fleet,
          metadata,
        });
        spin.succeed(`Device created: ${device.id}`);
      } catch (err) {
        error(`Failed to create device: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Delete device
  devices
    .command('delete <id>')
    .description('Delete a device')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const inquirer = await import('inquirer');
          const { confirm } = await inquirer.default.prompt([
            { type: 'confirm', name: 'confirm', message: `Delete device ${id}?`, default: false },
          ]);
          if (!confirm) return;
        }

        const spin = spinner('Deleting device...');
        await apiDelete(`/api/devices/${id}`);
        spin.succeed('Device deleted');
      } catch (err) {
        error(`Failed to delete device: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Activate device
  devices
    .command('activate <id>')
    .description('Activate a device')
    .action(async (id) => {
      try {
        const spin = spinner('Activating device...');
        await apiPatch(`/api/devices/${id}/activate`);
        spin.succeed('Device activated');
      } catch (err) {
        error(`Failed to activate device: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Suspend device
  devices
    .command('suspend <id>')
    .description('Suspend a device')
    .action(async (id) => {
      try {
        const spin = spinner('Suspending device...');
        await apiPatch(`/api/devices/${id}/suspend`);
        spin.succeed('Device suspended');
      } catch (err) {
        error(`Failed to suspend device: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}

