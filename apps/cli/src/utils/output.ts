import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function spinner(message: string): Ora {
  return ora(message).start();
}

export function table(headers: string[], rows: string[][]): void {
  const t = new Table({
    head: headers.map((h) => chalk.cyan(h)),
    style: { head: [], border: [] },
  });
  rows.forEach((row) => t.push(row));
  console.log(t.toString());
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export function formatStatus(status: string): string {
  const statusColors: Record<string, typeof chalk.green> = {
    active: chalk.green,
    online: chalk.green,
    healthy: chalk.green,
    completed: chalk.green,
    pending: chalk.yellow,
    offline: chalk.yellow,
    suspended: chalk.yellow,
    in_progress: chalk.blue,
    running: chalk.blue,
    error: chalk.red,
    failed: chalk.red,
    decommissioned: chalk.gray,
  };

  const colorFn = statusColors[status.toLowerCase()] || chalk.white;
  return colorFn(status);
}

