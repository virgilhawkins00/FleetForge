import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async register(name: string, email: string, password: string) {
    const { data } = await this.client.post('/auth/register', { name, email, password });
    return data;
  }

  async getProfile() {
    const { data } = await this.client.get('/auth/profile');
    return data;
  }

  // Devices
  async getDevices(params?: { status?: string; fleetId?: string }) {
    const { data } = await this.client.get('/devices', { params });
    return data;
  }

  async getDevice(id: string) {
    const { data } = await this.client.get(`/devices/${id}`);
    return data;
  }

  async createDevice(device: { name: string; type: string; fleetId?: string }) {
    const { data } = await this.client.post('/devices', device);
    return data;
  }

  async updateDevice(id: string, updates: Partial<{ name: string; status: string }>) {
    const { data } = await this.client.patch(`/devices/${id}`, updates);
    return data;
  }

  async deleteDevice(id: string) {
    await this.client.delete(`/devices/${id}`);
  }

  // Fleets
  async getFleets() {
    const { data } = await this.client.get('/fleets');
    return data;
  }

  async getFleet(id: string) {
    const { data } = await this.client.get(`/fleets/${id}`);
    return data;
  }

  async createFleet(fleet: { name: string; description?: string }) {
    const { data } = await this.client.post('/fleets', fleet);
    return data;
  }

  // Deployments
  async getDeployments(params?: { status?: string; fleetId?: string }) {
    const { data } = await this.client.get('/deployments', { params });
    return data;
  }

  async getDeployment(id: string) {
    const { data } = await this.client.get(`/deployments/${id}`);
    return data;
  }

  async createDeployment(deployment: { firmwareId: string; fleetId: string; strategy: string }) {
    const { data } = await this.client.post('/deployments', deployment);
    return data;
  }

  // Firmware
  async getFirmwares() {
    const { data } = await this.client.get('/firmware');
    return data;
  }

  // Dashboard Stats
  async getDashboardStats() {
    const { data } = await this.client.get('/dashboard/stats');
    return data;
  }
}

export const api = new ApiClient();

