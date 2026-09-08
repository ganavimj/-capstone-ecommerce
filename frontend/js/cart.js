// Cart state lives entirely in localStorage. Shape: [{ id, name, price, imageUrl, quantity }]
const CART_KEY = 'cart';

const Cart = {
  items() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    if (window.updateCartBadge) window.updateCartBadge();
  },
  count() {
    return this.items().reduce((n, i) => n + i.quantity, 0);
  },
  total() {
    return this.items().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
  add(product, quantity = 1) {
    const items = this.items();
    // Store id as a string so it always matches DOM dataset values.
    const pid = String(product._id);
    const found = items.find((i) => i.id === pid);
    if (found) {
      found.quantity += quantity;
    } else {
      items.push({
        id: pid,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity,
      });
    }
    this.save(items);
  },
  setQuantity(rawId, quantity) {
    const id = String(rawId);
    let items = this.items();
    if (quantity <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      const found = items.find((i) => i.id === id);
      if (found) found.quantity = quantity;
    }
    this.save(items);
  },
  remove(rawId) {
    const id = String(rawId);
    this.save(this.items().filter((i) => i.id !== id));
  },
  clear() {
    localStorage.removeItem(CART_KEY);
    if (window.updateCartBadge) window.updateCartBadge();
  },
  // Payload for POST /api/orders
  toOrderItems() {
    return this.items().map((i) => ({ productId: i.id, quantity: i.quantity }));
  },
};

window.Cart = Cart;
