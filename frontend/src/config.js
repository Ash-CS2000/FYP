// Central API base URL.
// Configured via Vite env var VITE_API_URL (see .env.development / .env.production).
// Falls back to the local Django dev server when unset.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
