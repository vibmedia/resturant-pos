// Backend API base URL — switch to production domain when deploying
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isDev
  ? 'http://localhost:38080/pos/api'
  : '/pos/api';
