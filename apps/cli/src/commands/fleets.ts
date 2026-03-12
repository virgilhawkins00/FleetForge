import { Command } from 'commander';
import { apiGet, apiPost, apiDelete } from '../api/client';
import { success, error, table, json, spinner, formatStatus, formatDate } from '../utils/output';

interface Fleet {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FleetList {
  fleets: Fleet[];
  total: number;
}

export function registerFleetsCommand(program: Command): void {
  const fleets = program.command('fleets').description('Fleet management commands');

  // List fleets
  fleets
    .command('list')
    .description('List all fleets')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const spin = spinner('Fetching fleets...');
        const data = await apiGet<FleetList>('/api/fleets');
        spin.stop();

        if (options.json) {
          json(data);
          return;
        }

        if (data.fleets.length === 0) {
          success('No fleets found');
          return;
        }

        table(
          ['ID', 'Name', 'Description', 'Devices', 'Status', 'Created'],
          data.fleets.map((f) => [
            f.id.substring(0, 8),
            f.name,
            f.description || '-',
            f.deviceCount.toString(),
            formatStatus(f.status),
            formatDate(f.createdAt),
          ]),
        );
        success(`Total: ${data.total} fleets`);
      } catch (err) {
        error(`Failed to list fleets: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get fleet
  fleets
    .command('get <id>')
    .description('Get fleet details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const spin = spinner('Fetching fleet...');
        const fleet = await apiGet<Fleet>(`/api/fleets/${id}`);
        spin.stop();

        if (options.json) {
          json(fleet);
          return;
        }

        console.log(`\nFleet: ${fleet.name}`);
        console.log(`  ID:          ${fleet.id}`);
        console.log(`  Description: ${fleet.description || 'None'}`);
        console.log(`  Devices:     ${fleet.deviceCount}`);
        console.log(`  Status:      ${formatStatus(fleet.status)}`);
        console.log(`  Created:     ${formatDate(fleet.createdAt)}`);
        console.log(`  Updated:     ${formatDate(fleet.updatedAt)}`);
      } catch (err) {
        error(`Failed to get fleet: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Create fleet
  fleets
    .command('create')
    .description('Create a new fleet')
    .requiredOption('--name <name>', 'Fleet name')
    .option('--description <desc>', 'Fleet description')
    .action(async (options) => {
      try {
        const spin = spinner('Creating fleet...');
        const fleet = await apiPost<Fleet>('/api/fleets', {
          name: options.name,
          description: options.description,
        });
        spin.succeed(`Fleet created: ${fleet.id}`);
      } catch (err) {
        error(`Failed to create fleet: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Delete fleet
  fleets
    .command('delete <id>')
    .description('Delete a fleet')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const inquirer = await import('inquirer');
          const { confirm } = await inquirer.default.prompt([
            { type: 'confirm', name: 'confirm', message: `Delete fleet ${id}?`, default: false },
          ]);
          if (!confirm) return;
        }

        const spin = spinner('Deleting fleet...');
        await apiDelete(`/api/fleets/${id}`);
        spin.succeed('Fleet deleted');
      } catch (err) {
        error(`Failed to delete fleet: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Add device to fleet
  fleets
    .command('add-device <fleetId> <deviceId>')
    .description('Add a device to a fleet')
    .action(async (fleetId, deviceId) => {
      try {
        const spin = spinner('Adding device to fleet...');
        await apiPost(`/api/fleets/${fleetId}/devices`, { deviceId });
        spin.succeed('Device added to fleet');
      } catch (err) {
        error(`Failed to add device: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Remove device from fleet
  fleets
    .command('remove-device <fleetId> <deviceId>')
    .description('Remove a device from a fleet')
    .action(async (fleetId, deviceId) => {
      try {
        const spin = spinner('Removing device from fleet...');
        await apiDelete(`/api/fleets/${fleetId}/devices/${deviceId}`);
        spin.succeed('Device removed from fleet');
      } catch (err) {
        error(`Failed to remove device: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
