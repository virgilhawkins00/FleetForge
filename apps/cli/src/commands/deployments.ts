import { Command } from 'commander';
import { apiGet, apiPost, apiPatch } from '../api/client';
import { success, error, table, json, spinner, formatStatus, formatDate } from '../utils/output';
import { getConfig } from '../config';

interface Deployment {
  id: string;
  name: string;
  firmwareVersion: string;
  fleetId: string;
  status: string;
  progress: number;
  totalDevices: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

interface DeploymentList {
  deployments: Deployment[];
  total: number;
}

export function registerDeploymentsCommand(program: Command): void {
  const deployments = program.command('deployments').description('Deployment management commands');

  // List deployments
  deployments
    .command('list')
    .description('List all deployments')
    .option('--fleet <id>', 'Filter by fleet ID')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const spin = spinner('Fetching deployments...');
        const params = new URLSearchParams();
        if (options.fleet) params.append('fleetId', options.fleet);
        if (options.status) params.append('status', options.status);

        const data = await apiGet<DeploymentList>(`/api/deployments?${params}`);
        spin.stop();

        if (options.json) {
          json(data);
          return;
        }

        if (data.deployments.length === 0) {
          success('No deployments found');
          return;
        }

        table(
          ['ID', 'Name', 'Firmware', 'Fleet', 'Status', 'Progress', 'Created'],
          data.deployments.map((d) => [
            d.id.substring(0, 8),
            d.name,
            d.firmwareVersion,
            d.fleetId.substring(0, 8),
            formatStatus(d.status),
            `${d.progress}%`,
            formatDate(d.createdAt),
          ])
        );
        success(`Total: ${data.total} deployments`);
      } catch (err) {
        error(`Failed to list deployments: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Get deployment status
  deployments
    .command('status <id>')
    .description('Get deployment status')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const spin = spinner('Fetching deployment status...');
        const deployment = await apiGet<Deployment>(`/api/deployments/${id}`);
        spin.stop();

        if (options.json) {
          json(deployment);
          return;
        }

        console.log(`\nDeployment: ${deployment.name}`);
        console.log(`  ID:        ${deployment.id}`);
        console.log(`  Firmware:  ${deployment.firmwareVersion}`);
        console.log(`  Fleet:     ${deployment.fleetId}`);
        console.log(`  Status:    ${formatStatus(deployment.status)}`);
        console.log(`  Progress:  ${deployment.progress}%`);
        console.log(`  Devices:   ${deployment.totalDevices}`);
        console.log(`  Success:   ${deployment.successCount}`);
        console.log(`  Failed:    ${deployment.failedCount}`);
        console.log(`  Created:   ${formatDate(deployment.createdAt)}`);
        if (deployment.completedAt) {
          console.log(`  Completed: ${formatDate(deployment.completedAt)}`);
        }
      } catch (err) {
        error(`Failed to get deployment: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Create deployment
  deployments
    .command('create')
    .description('Create a new deployment')
    .requiredOption('--firmware <version>', 'Firmware version to deploy')
    .option('--fleet <id>', 'Fleet ID (uses default if not specified)')
    .option('--name <name>', 'Deployment name')
    .option('--strategy <strategy>', 'Rollout strategy (immediate|phased|canary)', 'phased')
    .action(async (options) => {
      try {
        const fleetId = options.fleet || getConfig().defaultFleet;
        if (!fleetId) {
          error('Fleet ID required. Use --fleet or set default fleet with: fleetforge config set defaultFleet <id>');
          process.exit(1);
        }

        const spin = spinner('Creating deployment...');
        const deployment = await apiPost<Deployment>('/api/deployments', {
          name: options.name || `Deploy ${options.firmware}`,
          firmwareVersion: options.firmware,
          fleetId,
          strategy: options.strategy,
        });
        spin.succeed(`Deployment created: ${deployment.id}`);
        console.log(`\nMonitor with: fleetforge deployments status ${deployment.id}`);
      } catch (err) {
        error(`Failed to create deployment: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Rollback deployment
  deployments
    .command('rollback <id>')
    .description('Rollback a deployment')
    .option('--force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const inquirer = await import('inquirer');
          const { confirm } = await inquirer.default.prompt([
            { type: 'confirm', name: 'confirm', message: `Rollback deployment ${id}?`, default: false },
          ]);
          if (!confirm) return;
        }

        const spin = spinner('Rolling back deployment...');
        await apiPost(`/api/deployments/${id}/rollback`);
        spin.succeed('Deployment rolled back');
      } catch (err) {
        error(`Failed to rollback: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Pause deployment
  deployments
    .command('pause <id>')
    .description('Pause a running deployment')
    .action(async (id) => {
      try {
        const spin = spinner('Pausing deployment...');
        await apiPatch(`/api/deployments/${id}/pause`);
        spin.succeed('Deployment paused');
      } catch (err) {
        error(`Failed to pause: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Resume deployment
  deployments
    .command('resume <id>')
    .description('Resume a paused deployment')
    .action(async (id) => {
      try {
        const spin = spinner('Resuming deployment...');
        await apiPatch(`/api/deployments/${id}/resume`);
        spin.succeed('Deployment resumed');
      } catch (err) {
        error(`Failed to resume: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}

