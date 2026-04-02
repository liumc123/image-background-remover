// API Client for RMBG User API

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rmbg-user-api.liumc666.workers.dev';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Auth
export const auth = {
  register: (email: string, password: string, nickname?: string) =>
    apiFetch<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname }),
    }),
    
  login: (email: string, password: string) =>
    apiFetch<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    
  google: (idToken: string) =>
    apiFetch<any>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    }),
};

// User
export const user = {
  get: (token: string) =>
    apiFetch<any>('/api/users/me', { token }),
    
  update: (token: string, data: { nickname?: string; avatar_url?: string }) =>
    apiFetch<any>('/api/users/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),
};

// Memberships
export const memberships = {
  list: (token?: string) =>
    apiFetch<any>('/api/memberships', token ? { token } : {}),
    
  createOrder: (token: string, membershipId: string) =>
    apiFetch<any>('/api/memberships/orders', {
      method: 'POST',
      token,
      body: JSON.stringify({ membership_id: membershipId }),
    }),
};

// Points
export const points = {
  list: () => apiFetch<any>('/api/points'),
  
  createOrder: (token: string, packageId: string) =>
    apiFetch<any>('/api/points/orders', {
      method: 'POST',
      token,
      body: JSON.stringify({ package_id: packageId }),
    }),
    
  transactions: (token: string, limit = 50, offset = 0) =>
    apiFetch<any>(`/api/points/transactions?limit=${limit}&offset=${offset}`, { token }),
};
