const { query, withTransaction } = require('../config/db');
const HttpError = require('../utils/HttpError');

const STATUSES = ['pending', 'shipped', 'delivered'];

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    userId: row.user_email
      ? { id: row.user_id, name: row.user_name, email: row.user_email }
      : row.user_id,
    totalAmount: row.total_amount,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
    items: [],
  };
}

function mapItem(row) {
  return {
    productId: row.product_id,
    name: row.name,
    quantity: row.quantity,
    priceAtPurchase: row.price_at_purchase,
  };
}

// Attach line items to a list of orders (single extra query).
async function withItems(orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const { rows } = await query(
    'SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id',
    [ids]
  );
  const byOrder = new Map(orders.map((o) => [o.id, o]));
  for (const row of rows) byOrder.get(row.order_id).items.push(mapItem(row));
  return orders;
}

const Order = {
  STATUSES,

  /**
   * Create an order from [{ productId, quantity }]. Validates stock, snapshots
   * price, decrements stock — all in one transaction. Throws HttpError on
   * bad input / insufficient stock.
   */
  async checkout(userId, rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new HttpError(400, 'items must be a non-empty array');
    }

    // Collapse duplicate product ids, validate shape.
    const wanted = new Map();
    for (const raw of rawItems) {
      const id = Number(raw.productId);
      const qty = Number(raw.quantity);
      if (!Number.isInteger(id) || id < 1) {
        throw new HttpError(400, `Invalid productId: ${raw.productId}`);
      }
      if (!Number.isInteger(qty) || qty < 1) {
        throw new HttpError(400, `Invalid quantity for product ${id}`);
      }
      wanted.set(id, (wanted.get(id) || 0) + qty);
    }

    return withTransaction(async (client) => {
      const ids = [...wanted.keys()];
      // Lock the rows we're about to decrement.
      const { rows: products } = await client.query(
        'SELECT * FROM products WHERE id = ANY($1::int[]) FOR UPDATE',
        [ids]
      );
      if (products.length !== ids.length) {
        throw new HttpError(404, 'One or more products no longer exist');
      }

      let total = 0;
      const lineItems = [];
      for (const product of products) {
        const qty = wanted.get(product.id);
        if (product.stock < qty) {
          throw new HttpError(
            400,
            `Not enough stock for "${product.name}" (have ${product.stock})`
          );
        }
        total += Number(product.price) * qty;
        lineItems.push({
          productId: product.id,
          name: product.name,
          quantity: qty,
          priceAtPurchase: Number(product.price),
        });
      }
      total = Math.round(total * 100) / 100;

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (user_id, total_amount, payment_status, status)
         VALUES ($1, $2, 'paid', 'pending')
         RETURNING *`,
        [userId, total]
      );
      const order = orderRows[0];

      for (const item of lineItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name, quantity, price_at_purchase)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.name, item.quantity, item.priceAtPurchase]
        );
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
          item.quantity,
          item.productId,
        ]);
      }

      const mapped = mapOrder(order);
      mapped.items = lineItems;
      return mapped;
    });
  },

  async listByUser(userId) {
    const { rows } = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [userId]
    );
    return withItems(rows.map(mapOrder));
  },

  async listAll() {
    const { rows } = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email
       FROM orders o JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC, o.id DESC`
    );
    return withItems(rows.map(mapOrder));
  },

  async findById(id) {
    if (!Number.isInteger(Number(id))) return null;
    const { rows } = await query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [id]
    );
    if (!rows[0]) return null;
    const [order] = await withItems([mapOrder(rows[0])]);
    return order;
  },

  async updateStatus(id, status) {
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
    }
    const { rows } = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );
    if (!rows[0]) return null;
    return this.findById(id);
  },
};

module.exports = Order;
