import { Command } from 'commander';
import { getConfig, setConfig, clearConfig, FleetForgeConfig } from '../config';
import { success, error, info, table } from '../utils/output';

export function registerConfigCommand(program: Command): void {
  const config = program.command('config').description('Configuration commands');

  // Show config
  config
    .command('show')
    .description('Show current configuration')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const cfg = getConfig();

      if (options.json) {
        console.log(JSON.stringify(cfg, null, 2));
        return;
      }

      console.log('\nFleetForge Configuration:');
      console.log(`  API URL:       ${cfg.apiUrl}`);
      console.log(`  Token:         ${cfg.token ? '********' + cfg.token.slice(-4) : 'Not set'}`);
      console.log(`  Default Fleet: ${cfg.defaultFleet || 'Not set'}`);
    });

  // Set config value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const validKeys: (keyof FleetForgeConfig)[] = ['apiUrl', 'token', 'defaultFleet'];

      if (!validKeys.includes(key as keyof FleetForgeConfig)) {
        error(`Invalid config key: ${key}. Valid keys: ${validKeys.join(', ')}`);
        process.exit(1);
      }

      setConfig(key as keyof FleetForgeConfig, value);
      success(`Set ${key} = ${key === 'token' ? '********' : value}`);
    });

  // Get config value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const cfg = getConfig();
      const value = cfg[key as keyof FleetForgeConfig];

      if (value === undefined) {
        info(`${key} is not set`);
      } else {
        console.log(key === 'token' ? '********' + (value as string).slice(-4) : value);
      }
    });

  // Reset config
  config
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          { type: 'confirm', name: 'confirm', message: 'Reset all configuration?', default: false },
        ]);
        if (!confirm) return;
      }

      clearConfig();
      success('Configuration reset to defaults');
    });

  // List environment variables
  config
    .command('env')
    .description('Show environment variable overrides')
    .action(() => {
      console.log('\nEnvironment Variables:');
      table(
        ['Variable', 'Current Value', 'Description'],
        [
          [
            'FLEETFORGE_API_URL',
            process.env['FLEETFORGE_API_URL'] || '(not set)',
            'API endpoint URL',
          ],
          [
            'FLEETFORGE_TOKEN',
            process.env['FLEETFORGE_TOKEN'] ? '********' : '(not set)',
            'Authentication token',
          ],
          [
            'FLEETFORGE_FLEET',
            process.env['FLEETFORGE_FLEET'] || '(not set)',
            'Default fleet ID',
          ],
        ]
      );
      info('\nEnvironment variables take precedence over config file settings.');
    });
}

