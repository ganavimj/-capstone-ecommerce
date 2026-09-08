// Central fetch wrapper for all backend calls.
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const Api = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  async request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${window.API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Cannot reach the server. Is the API running?');
    }

    if (res.status === 401 && auth) {
      Api.clearSession();
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html';
      }
      throw new Error('Session expired, please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  // Auth
  register(payload) {
    return this.request('/api/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return this.request('/api/auth/login', { method: 'POST', body: payload });
  },
  me() {
    return this.request('/api/auth/me', { auth: true });
  },

  // Products
  listProducts({ search, category } = {}) {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (category) qs.set('category', category);
    const q = qs.toString();
    return this.request(`/api/products${q ? `?${q}` : ''}`);
  },
  getProduct(id) {
    return this.request(`/api/products/${id}`);
  },
  categories() {
    return this.request('/api/products/meta/categories');
  },
  createProduct(payload) {
    return this.request('/api/products', { method: 'POST', body: payload, auth: true });
  },
  updateProduct(id, payload) {
    return this.request(`/api/products/${id}`, { method: 'PUT', body: payload, auth: true });
  },
  deleteProduct(id) {
    return this.request(`/api/products/${id}`, { method: 'DELETE', auth: true });
  },

  // Orders
  createOrder(items) {
    return this.request('/api/orders', { method: 'POST', body: { items }, auth: true });
  },
  myOrders() {
    return this.request('/api/orders', { auth: true });
  },
  allOrders() {
    return this.request('/api/orders/all', { auth: true });
  },
  updateOrderStatus(id, status) {
    return this.request(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: { status },
      auth: true,
    });
  },
};

window.Api = Api;
