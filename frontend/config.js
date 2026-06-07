// Injected at deploy time by Vercel environment variable or build step
// Falls back to localhost for local development
window.BACKEND_URL = window.BACKEND_URL || 'http://localhost:8000';
