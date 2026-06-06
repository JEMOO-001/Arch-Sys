// frontend/src/utils/api.ts
import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim();

if (!rawBaseUrl) {
  throw new Error('VITE_API_URL is required');
}

export const API_URL = `${rawBaseUrl.replace(/\/$/, '')}/api/v1`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
