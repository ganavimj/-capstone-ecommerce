// Product detail page.
const box = document.getElementById('product');
const id = new URLSearchParams(location.search).get('id');

async function load() {
  if (!id) {
    box.innerHTML = '<p class="error-text">No product specified.</p>';
    return;
  }
  try {
    const p = await Api.getProduct(id);
    const out = p.stock <= 0;
    box.innerHTML = `
      <div class="detail">
        <img src="${escapeHtml(p.imageUrl) || placeholderImg(p.name)}" alt="${escapeHtml(p.name)}"
             onerror="this.src='${placeholderImg('No image')}'">
        <div class="stack">
          <div>
            <span class="cat">${escapeHtml(p.category)}</span>
            <h1>${escapeHtml(p.name)}</h1>
            <p class="price" style="font-size:1.4rem;font-weight:700">${money(p.price)}</p>
          </div>
          <p>${escapeHtml(p.description) || '<span class="muted">No description.</span>'}</p>
          <p class="${out ? 'stock-out' : 'muted'}">
            ${out ? 'Out of stock' : `${p.stock} in stock`}
          </p>
          <div class="qty">
            <label for="qty" style="margin:0">Qty</label>
            <input type="number" id="qty" value="1" min="1" max="${Math.max(p.stock, 1)}" ${out ? 'disabled' : ''}>
            <button class="btn" id="add" ${out ? 'disabled' : ''}>Add to cart</button>
          </div>
          <a href="products.html" class="muted">&larr; Back to products</a>
        </div>
      </div>`;

    const addBtn = document.getElementById('add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const qty = Math.max(1, parseInt(document.getElementById('qty').value, 10) || 1);
        Cart.add(p, qty);
        toast(`Added ${qty} × "${p.name}" to cart`, 'ok');
      });
    }
  } catch (err) {
    box.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

load();
