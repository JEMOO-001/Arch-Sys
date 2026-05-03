import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

// Generate a simple CSRF token (in production, this should come from the server)
let csrfToken: string | null = null;

export const getCsrfToken = (): string => {
  if (!csrfToken) {
    csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  return csrfToken;
};

// Configure axios defaults
axios.defaults.withCredentials = true;

// Axios request interceptor to add CSRF token for mutating requests
axios.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any)['x-csrf-token'] = getCsrfToken();
  }
  return config;
});

export { API_URL };
export default axios;
