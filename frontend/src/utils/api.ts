import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1';

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from backend and store it.
 * Must be called before any mutating requests.
 */
export const initializeCsrf = async (): Promise<string> => {
  try {
    const res = await axios.get(`${API_URL}/auth/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = res.data.csrf_token;
    return csrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    throw err;
  }
};

export const getCsrfToken = (): string | null => csrfToken;

// Configure axios defaults
axios.defaults.withCredentials = true;

// Request interceptor: add CSRF token for mutating requests
axios.interceptors.request.use(
  (config) => {
    if (
      config.method &&
      ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
    ) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      (config.headers as any)['x-csrf-token'] = csrfToken || '';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: retry on 403 CSRF failure
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const maxRetries = 3;
    const retryCount = (originalRequest._retryCount || 0) + 1;

    if (
      error.response?.status === 403 &&
      error.response?.data?.detail?.includes('CSRF') &&
      retryCount < maxRetries
    ) {
      originalRequest._retryCount = retryCount;
      console.warn(`CSRF token invalid (attempt ${retryCount}/${maxRetries}), refreshing...`);

      try {
        await initializeCsrf();
        originalRequest.headers['x-csrf-token'] = csrfToken;
        return axios(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export { API_URL };
export default axios;
