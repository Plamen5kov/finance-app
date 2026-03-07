import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token from cookie for client-side requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Unwrap the { success, data } envelope returned by the backend
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.error?.message ?? error.message;
    return Promise.reject(new Error(message));
  },
);
