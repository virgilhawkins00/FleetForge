import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiUrl, getToken } from '../config';
import chalk from 'chalk';

let client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    client.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error(chalk.red('Authentication failed. Please run: fleetforge login'));
          process.exit(1);
        }
        throw error;
      }
    );
  }
  return client;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await getClient().get<T>(path);
  return response.data;
}

export async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  const response = await getClient().post<T>(path, data);
  return response.data;
}

export async function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  const response = await getClient().patch<T>(path, data);
  return response.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await getClient().delete<T>(path);
  return response.data;
}

