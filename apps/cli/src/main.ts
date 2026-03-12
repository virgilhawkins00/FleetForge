#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { registerDevicesCommand } from './commands/devices';
import { registerFleetsCommand } from './commands/fleets';
import { registerDeploymentsCommand } from './commands/deployments';
import { registerAuthCommand } from './commands/auth';
import { registerConfigCommand } from './commands/config';

const program = new Command();

program
  .name('fleetforge')
  .description('FleetForge CLI - Manage IoT devices, fleets, and deployments')
  .version(version);

// Register commands
registerAuthCommand(program);
registerDevicesCommand(program);
registerFleetsCommand(program);
registerDeploymentsCommand(program);
registerConfigCommand(program);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

