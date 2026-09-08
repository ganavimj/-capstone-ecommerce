// Customer order history.
const box = document.getElementById('orders');
const placedId = new URLSearchParams(location.search).get('placed');

if (!Auth.requireLogin()) {
  // redirected
} else {
  load();
}

function orderCard(o) {
  const highlight = placedId && String(o._id) === placedId;
  return `
    <div class="panel${highlight ? '' : ''}" style="${highlight ? 'border-color:var(--ok)' : ''}">
      <div class="row-between">
        <div>
          <strong>Order #${o._id}</strong>
          <span class="muted"> · ${new Date(o.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <span class="pill ${o.status}">${o.status}</span>
          <span class="pill paid">paid</span>
        </div>
      </div>
      <div class="table-wrap" style="margin-top:10px">
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${o.items
              .map(
                (it) => `<tr>
                  <td>${escapeHtml(it.name)}</td>
                  <td>${it.quantity}</td>
                  <td>${money(it.priceAtPurchase)}</td>
                  <td>${money(it.priceAtPurchase * it.quantity)}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="row-between" style="margin-top:10px">
        <span></span>
        <strong>Total: ${money(o.totalAmount)}</strong>
      </div>
    </div>`;
}

async function load() {
  box.innerHTML = '<p class="muted">Loading orders…</p>';
  try {
    const orders = await Api.myOrders();
    if (!orders.length) {
      box.innerHTML = '<div class="empty">No orders yet. <a href="products.html">Start shopping</a>.</div>';
      return;
    }
    box.innerHTML = orders.map(orderCard).join('');
    if (placedId) toast('Order confirmed', 'ok');
  } catch (err) {
    box.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}
