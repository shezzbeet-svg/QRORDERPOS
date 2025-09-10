import { MenuItem } from '@qrorderpos/types';

export class APIClient {
  constructor(private baseUrl = '/api') {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json() as Promise<T>;
  }

  getMenu() {
    return this.request<MenuItem[]>('/menu');
  }

  startSession(tableId: string, pax: number) {
    return this.request<{ id: string }>(`/sessions`, {
      method: 'POST',
      body: JSON.stringify({ tableId, pax })
    });
  }

  callWaiter(sessionId: string, reason: string) {
    return this.request(`/sessions/${sessionId}/call-waiter`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
}

export const apiClient = new APIClient();
