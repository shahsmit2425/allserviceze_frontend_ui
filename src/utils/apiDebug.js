// Emergency API debugging utility
// This will log ALL API calls and errors to help diagnose issues

import axios from 'axios';
import config from '@/config';

const env = (import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || '').toLowerCase();
const isDevelopment = env === 'development' || env === 'dev';

if (isDevelopment && typeof window !== 'undefined' && !window.__SERVICETONES_API_DEBUG_INSTALLED__) {
  window.__SERVICETONES_API_DEBUG_INSTALLED__ = true;

  // Intercept all axios requests
  axios.interceptors.request.use(
    (requestConfig) => {
      console.group('🌐 API REQUEST');
      console.log('URL:', requestConfig.url);
      console.log('Method:', requestConfig.method?.toUpperCase());
      console.log('Base URL:', requestConfig.baseURL || 'none');
      console.log('Full URL:', `${requestConfig.baseURL || ''}${requestConfig.url}`);
      console.log('Headers:', requestConfig.headers);
      console.groupEnd();
      return requestConfig;
    },
    (error) => {
      console.error('❌ REQUEST ERROR:', error);
      return Promise.reject(error);
    }
  );

  // Intercept all axios responses
  axios.interceptors.response.use(
    (response) => {
      console.group('✅ API RESPONSE');
      console.log('URL:', response.config.url);
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.groupEnd();
      return response;
    },
    (error) => {
      console.group('❌ API ERROR');
      console.log('URL:', error.config?.url);
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      console.log('Response:', error.response?.data);
      console.log('Network Error:', error.message === 'Network Error' ? 'YES - Cannot reach server!' : 'no');

      if (error.message === 'Network Error') {
        console.error('🚨 NETWORK ERROR - Possible causes:');
        console.error('  1. Backend is down');
        console.error('  2. Wrong URL (check API_URL)');
        console.error('  3. CORS not configured');
        console.error('  4. Network security blocking request');
        console.error('  Current backend:', config.apiUrl);
      }

      console.groupEnd();
      return Promise.reject(error);
    }
  );

  console.log('🔍 API Debug interceptor installed');
  console.log('📡 Backend URL:', config.apiUrl);
  console.log('🔙 API URL:', config.backendUrl);
}
