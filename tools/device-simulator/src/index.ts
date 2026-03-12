#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { SimulatedDevice } from './device';
import { SimulatorConfig, SimulatorStats, DeviceConfig } from './types';

const program = new Command();

const stats: SimulatorStats = {
  devicesCreated: 0,
  telemetrySent: 0,
  errors: 0,
  uptime: 0,
  startTime: new Date(),
};

const devices: SimulatedDevice[] = [];

function printBanner(): void {
  console.log(
    chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${chalk.bold('FleetForge Device Simulator')}                            ║
║   ${chalk.gray('Simulate IoT devices for testing and development')}       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`),
  );
}

function printStats(): void {
  const uptime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  console.log(chalk.gray(`\n─── Simulator Stats ───`));
  console.log(`  ${chalk.green('●')} Devices: ${chalk.bold(stats.devicesCreated)}`);
  console.log(`  ${chalk.blue('↑')} Telemetry: ${chalk.bold(stats.telemetrySent)}`);
  console.log(`  ${chalk.red('✗')} Errors: ${chalk.bold(stats.errors)}`);
  console.log(`  ${chalk.yellow('⏱')} Uptime: ${chalk.bold(uptime)}s`);
}

async function runSimulator(config: SimulatorConfig): Promise<void> {
  printBanner();
  console.log(chalk.gray(`Protocol: ${config.protocol.toUpperCase()}`));
  console.log(chalk.gray(`API URL: ${config.apiUrl}`));
  if (config.protocol === 'mqtt') {
    console.log(chalk.gray(`MQTT Broker: ${config.mqttUrl || 'mqtt://localhost:1883'}`));
  } else {
    console.log(chalk.gray(`WebSocket: ${config.wsUrl}`));
  }
  console.log(chalk.gray(`Device Type: ${config.deviceType}`));
  console.log(chalk.gray(`Device Count: ${config.deviceCount}`));
  console.log(chalk.gray(`Telemetry Interval: ${config.telemetryIntervalMs}ms\n`));

  // Create devices
  console.log(chalk.yellow('Creating simulated devices...'));
  for (let i = 0; i < config.deviceCount; i++) {
    const device = new SimulatedDevice(config, i + 1, {
      onTelemetry: () => {
        stats.telemetrySent++;
      },
      onError: () => {
        stats.errors++;
      },
    });
    devices.push(device);
    stats.devicesCreated++;
  }
  console.log(chalk.green(`✓ Created ${devices.length} devices\n`));

  // Register devices (optional - skip if no token)
  if (config.token) {
    console.log(chalk.yellow('Registering devices with API...'));
    for (const device of devices) {
      try {
        await device.register();
        console.log(chalk.green(`  ✓ ${device.getConfig().name} registered`));
      } catch {
        console.log(chalk.red(`  ✗ ${device.getConfig().name} failed`));
      }
    }
  }

  // Connect based on protocol
  const protocolLabel = config.protocol === 'mqtt' ? 'MQTT Broker' : 'WebSocket';
  console.log(chalk.yellow(`\nConnecting to ${protocolLabel}...`));
  for (const device of devices) {
    try {
      await device.connect();
      console.log(chalk.green(`  ✓ ${device.getConfig().name} connected`));
    } catch {
      console.log(chalk.yellow(`  ○ ${device.getConfig().name} skipped`));
    }
  }

  // Start telemetry
  console.log(chalk.yellow('\nStarting telemetry streams...'));
  for (const device of devices) {
    device.startTelemetry();
  }
  console.log(chalk.green(`✓ Telemetry started for ${devices.length} devices\n`));

  // Print stats periodically
  const statsInterval = setInterval(printStats, 10000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nShutting down simulator...'));
    clearInterval(statsInterval);
    for (const device of devices) {
      await device.stop();
    }
    printStats();
    console.log(chalk.green('✓ Simulator stopped\n'));
    process.exit(0);
  });

  console.log(chalk.cyan('Simulator running. Press Ctrl+C to stop.\n'));
}

program
  .name('fleetforge-simulator')
  .description('FleetForge IoT Device Simulator')
  .version('0.1.0');

program
  .command('start')
  .description('Start the device simulator')
  .option('-p, --protocol <protocol>', 'Transport protocol (websocket|mqtt)', 'mqtt')
  .option('-u, --api-url <url>', 'API URL', 'http://localhost:3100')
  .option('-w, --ws-url <url>', 'WebSocket URL', 'ws://localhost:3100')
  .option('-m, --mqtt-url <url>', 'MQTT Broker URL', 'mqtt://localhost:1883')
  .option('-t, --token <token>', 'Authentication token')
  .option('-n, --count <number>', 'Number of devices to simulate', '5')
  .option('-i, --interval <ms>', 'Telemetry interval in ms', '5000')
  .option('-T, --type <type>', 'Device type (gateway|sensor|edge|actuator)', 'sensor')
  .option('-f, --fleet <id>', 'Fleet ID to assign devices')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    const config: SimulatorConfig = {
      protocol: options.protocol as 'websocket' | 'mqtt',
      apiUrl: options.apiUrl,
      wsUrl: options.wsUrl,
      mqttUrl: options.mqttUrl,
      token: options.token,
      deviceCount: parseInt(options.count, 10),
      telemetryIntervalMs: parseInt(options.interval, 10),
      deviceType: options.type as DeviceConfig['type'],
      fleetId: options.fleet,
      verbose: options.verbose,
    };
    await runSimulator(config);
  });

program
  .command('mqtt')
  .description('Start simulator with MQTT protocol (connects to mqtt-gateway)')
  .option('-m, --mqtt-url <url>', 'MQTT Broker URL', 'mqtt://localhost:1883')
  .option('-n, --count <number>', 'Number of devices', '3')
  .option('-i, --interval <ms>', 'Telemetry interval', '3000')
  .option('-T, --type <type>', 'Device type', 'sensor')
  .option('-v, --verbose', 'Verbose logging', false)
  .action(async (options) => {
    const config: SimulatorConfig = {
      protocol: 'mqtt',
      apiUrl: 'http://localhost:3100',
      wsUrl: '',
      mqttUrl: options.mqttUrl,
      deviceCount: parseInt(options.count, 10),
      telemetryIntervalMs: parseInt(options.interval, 10),
      deviceType: options.type as DeviceConfig['type'],
      verbose: options.verbose,
    };
    await runSimulator(config);
  });

program
  .command('test')
  .description('Run a quick test with 2 devices for 30 seconds')
  .option('-p, --protocol <protocol>', 'Protocol (websocket|mqtt)', 'mqtt')
  .option('-u, --api-url <url>', 'API URL', 'http://localhost:3100')
  .action(async (options) => {
    const config: SimulatorConfig = {
      protocol: options.protocol as 'websocket' | 'mqtt',
      apiUrl: options.apiUrl,
      wsUrl: 'ws://localhost:3100',
      mqttUrl: 'mqtt://localhost:1883',
      deviceCount: 2,
      telemetryIntervalMs: 2000,
      deviceType: 'sensor',
      verbose: true,
    };
    await runSimulator(config);
    setTimeout(() => process.kill(process.pid, 'SIGINT'), 30000);
  });

program.parse();
