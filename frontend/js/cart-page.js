// Cart page: render cart, edit quantities, checkout.
const list = document.getElementById('cart-list');
const summary = document.getElementById('cart-summary');
const checkoutBtn = document.getElementById('checkout');

function render() {
  const items = Cart.items();
  if (!items.length) {
    list.innerHTML = '<div class="empty">Your cart is empty. <a href="products.html">Browse products</a>.</div>';
    summary.innerHTML = '';
    return;
  }

  list.innerHTML = items
    .map(
      (i) => `
      <div class="cart-row" data-id="${i.id}">
        <img src="${escapeHtml(i.imageUrl) || placeholderImg(i.name)}" alt=""
             onerror="this.src='${placeholderImg('No image')}'">
        <div class="grow">
          <div><strong>${escapeHtml(i.name)}</strong></div>
          <div class="muted">${money(i.price)} each</div>
        </div>
        <div class="qty">
          <button class="btn btn-secondary btn-sm dec">−</button>
          <input type="number" class="qty-input" value="${i.quantity}" min="1">
          <button class="btn btn-secondary btn-sm inc">+</button>
        </div>
        <div style="min-width:70px;text-align:right"><strong>${money(i.price * i.quantity)}</strong></div>
        <button class="btn btn-danger btn-sm remove">Remove</button>
      </div>`
    )
    .join('');

  summary.innerHTML = `
    <div class="panel box">
      <div class="summary-line"><span>Items</span><span>${Cart.count()}</span></div>
      <div class="summary-line total"><span>Total</span><span>${money(Cart.total())}</span></div>
    </div>`;
}

list.addEventListener('click', (e) => {
  const row = e.target.closest('.cart-row');
  if (!row) return;
  const id = row.dataset.id;
  const current = Cart.items().find((i) => i.id === id);
  if (!current) return;

  if (e.target.classList.contains('inc')) Cart.setQuantity(id, current.quantity + 1);
  else if (e.target.classList.contains('dec')) Cart.setQuantity(id, current.quantity - 1);
  else if (e.target.classList.contains('remove')) Cart.remove(id);
  else return;
  render();
});

list.addEventListener('change', (e) => {
  if (!e.target.classList.contains('qty-input')) return;
  const row = e.target.closest('.cart-row');
  const qty = parseInt(e.target.value, 10);
  Cart.setQuantity(row.dataset.id, Number.isFinite(qty) ? qty : 1);
  render();
});

checkoutBtn.addEventListener('click', async () => {
  if (!Cart.items().length) return;
  if (!Auth.isLoggedIn()) {
    toast('Please log in to check out', 'error');
    setTimeout(() => (location.href = 'login.html?next=cart.html'), 800);
    return;
  }
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Placing order…';
  try {
    const order = await Api.createOrder(Cart.toOrderItems());
    Cart.clear();
    toast('Order placed! Payment simulated as paid.', 'ok');
    setTimeout(() => (location.href = `orders.html?placed=${order._id}`), 700);
  } catch (err) {
    toast(err.message, 'error');
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout';
    render();
  }
});

render();
