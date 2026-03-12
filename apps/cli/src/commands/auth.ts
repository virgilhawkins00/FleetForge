import { Command } from 'commander';
import inquirer from 'inquirer';
import { setConfig, clearConfig, getConfig, hasToken } from '../config';
import { apiPost, getClient } from '../api/client';
import { success, error, info, spinner } from '../utils/output';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export function registerAuthCommand(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  // Login command
  auth
    .command('login')
    .description('Login to FleetForge')
    .option('--token <token>', 'API token for non-interactive login')
    .option('--api-url <url>', 'API URL')
    .action(async (options) => {
      try {
        if (options.apiUrl) {
          setConfig('apiUrl', options.apiUrl);
        }

        if (options.token) {
          setConfig('token', options.token);
          success('Logged in with API token');
          return;
        }

        // Interactive login
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input: string) => input.includes('@') || 'Please enter a valid email',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
          },
        ]);

        const spin = spinner('Logging in...');

        const response = await apiPost<LoginResponse>('/api/auth/login', {
          email: answers.email,
          password: answers.password,
        });

        setConfig('token', response.accessToken);
        spin.succeed(`Logged in as ${response.user.email}`);
      } catch (err) {
        error(`Login failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Logout command
  auth
    .command('logout')
    .description('Logout from FleetForge')
    .action(() => {
      clearConfig();
      success('Logged out successfully');
    });

  // Whoami command
  auth
    .command('whoami')
    .description('Show current user')
    .action(async () => {
      if (!hasToken()) {
        error('Not logged in. Run: fleetforge auth login');
        process.exit(1);
      }

      try {
        const spin = spinner('Fetching user info...');
        const user = await getClient().get('/api/auth/me');
        spin.stop();

        info(`Logged in as: ${user.data.email}`);
        info(`API URL: ${getConfig().apiUrl}`);
      } catch (err) {
        error(`Failed to get user info: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Also add as top-level commands for convenience
  program
    .command('login')
    .description('Login to FleetForge (alias for auth login)')
    .action(() => {
      program.parse(['node', 'fleetforge', 'auth', 'login', ...process.argv.slice(3)]);
    });

  program
    .command('logout')
    .description('Logout from FleetForge (alias for auth logout)')
    .action(() => {
      clearConfig();
      success('Logged out successfully');
    });

  program
    .command('whoami')
    .description('Show current user (alias for auth whoami)')
    .action(() => {
      program.parse(['node', 'fleetforge', 'auth', 'whoami']);
    });
}
