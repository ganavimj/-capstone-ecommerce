// Product list page: fetch, search, filter, render, add-to-cart.
const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');

let debounce;

function productCard(p) {
  const out = p.stock <= 0;
  return `
    <div class="product-card">
      <a href="product-detail.html?id=${p._id}">
        <img src="${escapeHtml(p.imageUrl) || placeholderImg(p.name)}" alt="${escapeHtml(p.name)}"
             onerror="this.src='${placeholderImg('No image')}'">
      </a>
      <div class="body">
        <span class="cat">${escapeHtml(p.category)}</span>
        <h3><a href="product-detail.html?id=${p._id}">${escapeHtml(p.name)}</a></h3>
        <span class="price">${money(p.price)}</span>
        <div class="row">
          ${
            out
              ? '<span class="stock-out">Out of stock</span>'
              : `<button class="btn btn-sm add-btn" data-id="${p._id}">Add to cart</button>`
          }
        </div>
      </div>
    </div>`;
}

async function loadCategories() {
  try {
    const cats = await Api.categories();
    categorySelect.innerHTML =
      '<option value="">All categories</option>' +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  } catch {
    /* non-fatal */
  }
}

async function loadProducts() {
  grid.innerHTML = '<p class="muted">Loading products…</p>';
  try {
    const products = await Api.listProducts({
      search: searchInput.value.trim(),
      category: categorySelect.value,
    });
    if (!products.length) {
      grid.innerHTML = '<div class="empty">No products match your search.</div>';
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
    grid._products = products;
  } catch (err) {
    grid.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-btn');
  if (!btn) return;
  const product = (grid._products || []).find((p) => p._id === btn.dataset.id);
  if (product) {
    Cart.add(product, 1);
    toast(`Added "${product.name}" to cart`, 'ok');
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(loadProducts, 300);
});
categorySelect.addEventListener('change', loadProducts);

loadCategories();
loadProducts();
