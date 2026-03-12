import Conf from 'conf';

export interface FleetForgeConfig {
  apiUrl: string;
  token?: string;
  defaultFleet?: string;
}

const config = new Conf<FleetForgeConfig>({
  projectName: 'fleetforge',
  defaults: {
    apiUrl: process.env['FLEETFORGE_API_URL'] || 'http://localhost:3100',
  },
});

export function getConfig(): FleetForgeConfig {
  return {
    apiUrl: process.env['FLEETFORGE_API_URL'] || config.get('apiUrl'),
    token: process.env['FLEETFORGE_TOKEN'] || config.get('token'),
    defaultFleet: process.env['FLEETFORGE_FLEET'] || config.get('defaultFleet'),
  };
}

export function setConfig(key: keyof FleetForgeConfig, value: string): void {
  config.set(key, value);
}

export function clearConfig(): void {
  config.clear();
}

export function getApiUrl(): string {
  return getConfig().apiUrl;
}

export function getToken(): string | undefined {
  return getConfig().token;
}

export function hasToken(): boolean {
  return !!getToken();
}

