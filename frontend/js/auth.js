// Shared nav rendering + auth helpers. Every page includes this after api.js and cart.js.
const escapeHtmlSafe = (s) =>
  window.escapeHtml ? window.escapeHtml(s) : String(s ?? '').replace(/[&<>"']/g, '');

const Auth = {
  user() {
    return Api.getUser();
  },
  isLoggedIn() {
    return !!Api.getToken();
  },
  isAdmin() {
    const u = Api.getUser();
    return !!u && u.role === 'admin';
  },
  logout() {
    Api.clearSession();
    location.href = 'index.html';
  },
  // Redirect guard for pages that need a session / admin.
  requireLogin() {
    if (!this.isLoggedIn()) {
      location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop())}`;
      return false;
    }
    return true;
  },
  requireAdmin() {
    if (!this.requireLogin()) return false;
    if (!this.isAdmin()) {
      location.href = 'index.html';
      return false;
    }
    return true;
  },
};

function renderNav() {
  const el = document.getElementById('site-nav');
  if (!el) return;
  const loggedIn = Auth.isLoggedIn();
  const admin = Auth.isAdmin();
  const user = Auth.user();
  const count = window.Cart ? Cart.count() : 0;
  // Pages under /admin/ need to climb one level for shared links.
  const base = location.pathname.includes('/admin/') ? '../' : '';
  const adminHref = location.pathname.includes('/admin/')
    ? 'dashboard.html'
    : 'admin/dashboard.html';

  el.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="${base}index.html">Capstone Store</a>
      <nav class="nav-links">
        <a href="${base}products.html">Products</a>
        <a href="${base}cart.html">Cart <span class="badge" id="cart-badge">${count}</span></a>
        ${loggedIn ? `<a href="${base}orders.html">My Orders</a>` : ''}
        ${admin ? `<a href="${adminHref}">Admin</a>` : ''}
        ${
          loggedIn
            ? `<span class="nav-user">${user ? escapeHtmlSafe(user.name) : ''}</span>
               <a href="#" id="logout-link">Log out</a>`
            : `<a href="${base}login.html">Log in</a><a href="${base}register.html">Register</a>`
        }
      </nav>
    </div>`;

  const logout = document.getElementById('logout-link');
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge && window.Cart) badge.textContent = Cart.count();
}

window.Auth = Auth;
window.renderNav = renderNav;
window.updateCartBadge = updateCartBadge;

document.addEventListener('DOMContentLoaded', renderNav);
