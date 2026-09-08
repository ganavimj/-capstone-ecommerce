// Home page: show a handful of products as "featured".
const featured = document.getElementById('featured');

async function load() {
  try {
    const products = await Api.listProducts();
    const pick = products.slice(0, 4);
    if (!pick.length) {
      featured.innerHTML = '<div class="empty">No products yet. Seed the database.</div>';
      return;
    }
    featured.innerHTML = pick
      .map(
        (p) => `
        <div class="product-card">
          <a href="product-detail.html?id=${p._id}">
            <img src="${escapeHtml(p.imageUrl) || placeholderImg(p.name)}" alt="${escapeHtml(p.name)}"
                 onerror="this.src='${placeholderImg('No image')}'">
          </a>
          <div class="body">
            <span class="cat">${escapeHtml(p.category)}</span>
            <h3><a href="product-detail.html?id=${p._id}">${escapeHtml(p.name)}</a></h3>
            <span class="price">${money(p.price)}</span>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    featured.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

load();
