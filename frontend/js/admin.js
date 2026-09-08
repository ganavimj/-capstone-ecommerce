// Admin dashboard: product CRUD + order status management.
const STATUSES = ['pending', 'shipped', 'delivered'];

/* ---- tabs ---- */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('btn'));
      buttons.forEach((b) => b.classList.add('btn-secondary'));
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn');
      document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
      document.getElementById(btn.dataset.target).hidden = false;
    });
  });
}

/* ---- products ---- */
const productTable = document.getElementById('product-rows');
const productForm = document.getElementById('product-form');
const formTitle = document.getElementById('product-form-title');
const resetBtn = document.getElementById('product-reset');

async function loadProducts() {
  productTable.innerHTML = '<tr><td colspan="6" class="muted">Loading…</td></tr>';
  try {
    const products = await Api.listProducts();
    productTable._data = products;
    productTable.innerHTML = products
      .map(
        (p) => `
        <tr data-id="${p._id}">
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>${money(p.price)}</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn btn-secondary btn-sm edit">Edit</button>
            <button class="btn btn-danger btn-sm del">Delete</button>
          </td>
        </tr>`
      )
      .join('');
  } catch (err) {
    productTable.innerHTML = `<tr><td colspan="6" class="error-text">${escapeHtml(err.message)}</td></tr>`;
  }
}

// Access a control by name (form.name is shadowed by HTMLFormElement.name).
const pf = (name) => productForm.elements.namedItem(name);

function fillForm(p) {
  pf('productId').value = p?._id || '';
  pf('name').value = p?.name || '';
  pf('category').value = p?.category || '';
  pf('price').value = p?.price ?? '';
  pf('stock').value = p?.stock ?? '';
  pf('imageUrl').value = p?.imageUrl || '';
  pf('description').value = p?.description || '';
  formTitle.textContent = p ? `Edit: ${p.name}` : 'New product';
  resetBtn.hidden = !p;
}

productTable.addEventListener('click', async (e) => {
  const row = e.target.closest('tr');
  if (!row) return;
  const id = row.dataset.id;
  const product = (productTable._data || []).find((p) => p._id === id);

  if (e.target.classList.contains('edit')) {
    fillForm(product);
    productForm.scrollIntoView({ behavior: 'smooth' });
  } else if (e.target.classList.contains('del')) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await Api.deleteProduct(id);
      toast('Product deleted', 'ok');
      loadProducts();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: pf('name').value.trim(),
    category: pf('category').value.trim(),
    price: Number(pf('price').value),
    stock: Number(pf('stock').value),
    imageUrl: pf('imageUrl').value.trim(),
    description: pf('description').value.trim(),
  };
  const id = pf('productId').value;
  try {
    if (id) {
      await Api.updateProduct(id, payload);
      toast('Product updated', 'ok');
    } else {
      await Api.createProduct(payload);
      toast('Product created', 'ok');
    }
    fillForm(null);
    loadProducts();
  } catch (err) {
    toast(err.message, 'error');
  }
});

resetBtn.addEventListener('click', () => fillForm(null));

/* ---- orders ---- */
const orderTable = document.getElementById('order-rows');

async function loadOrders() {
  orderTable.innerHTML = '<tr><td colspan="6" class="muted">Loading…</td></tr>';
  try {
    const orders = await Api.allOrders();
    orderTable.innerHTML = orders
      .map((o) => {
        const customer = o.userId ? `${escapeHtml(o.userId.name)}<br><span class="muted">${escapeHtml(o.userId.email)}</span>` : '—';
        const itemList = o.items.map((i) => `${escapeHtml(i.name)} ×${i.quantity}`).join('<br>');
        return `
        <tr data-id="${o._id}">
          <td>${o._id.slice(-6).toUpperCase()}</td>
          <td>${customer}</td>
          <td>${itemList}</td>
          <td>${money(o.totalAmount)}</td>
          <td>${new Date(o.createdAt).toLocaleDateString()}</td>
          <td>
            <select class="status-select">
              ${STATUSES.map(
                (s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </td>
        </tr>`;
      })
      .join('');
    if (!orders.length) {
      orderTable.innerHTML = '<tr><td colspan="6" class="muted">No orders yet.</td></tr>';
    }
  } catch (err) {
    orderTable.innerHTML = `<tr><td colspan="6" class="error-text">${escapeHtml(err.message)}</td></tr>`;
  }
}

orderTable.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('status-select')) return;
  const id = e.target.closest('tr').dataset.id;
  try {
    await Api.updateOrderStatus(id, e.target.value);
    toast(`Order updated to "${e.target.value}"`, 'ok');
  } catch (err) {
    toast(err.message, 'error');
    loadOrders();
  }
});

/* ---- bootstrap ---- */
if (Auth.requireAdmin()) {
  initTabs();
  loadProducts();
  loadOrders();
}
