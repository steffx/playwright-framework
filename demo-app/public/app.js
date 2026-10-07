// Shared client helpers for ShopLite pages.
const TOKEN_KEY = 'shoplite.token';
const USER_KEY = 'shoplite.user';

const Shop = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null'),

  async api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (Shop.token()) headers.Authorization = `Bearer ${Shop.token()}`;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith('/api/auth')) {
      Shop.logout();
      return new Promise(() => {}); // page is navigating to login; never resolve
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  requireLogin() {
    if (!Shop.token()) location.replace('/login.html');
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    location.href = '/login.html';
  },

  money: (n) => `$${n.toFixed(2)}`,

  async renderHeader() {
    const header = document.querySelector('header.site');
    const user = Shop.user();
    header.innerHTML = `
      <a class="brand" href="/inventory.html">ShopLite</a>
      <nav aria-label="Main">
        <span class="greeting">Hi, ${user ? user.firstName : 'guest'}</span>
        <a href="/cart.html" class="cart-link" aria-label="Cart">
          Cart <span class="badge" data-testid="cart-count">0</span>
        </a>
        <button type="button" class="link" id="logout">Log out</button>
      </nav>`;
    document.getElementById('logout').addEventListener('click', Shop.logout);
    if (Shop.token()) await Shop.refreshCartCount();
  },

  async refreshCartCount() {
    const badge = document.querySelector('[data-testid="cart-count"]');
    if (!badge) return;
    const cart = await Shop.api('/api/cart');
    badge.textContent = String(cart.items.reduce((n, i) => n + i.quantity, 0));
  },

  toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(Shop._toastTimer);
    Shop._toastTimer = setTimeout(() => (el.hidden = true), 3000);
  },
};
