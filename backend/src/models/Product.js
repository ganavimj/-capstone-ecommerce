const { query } = require('../config/db');

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    stock: row.stock,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Product = {
  async list({ search, category } = {}) {
    const where = [];
    const params = [];
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).trim()}%`);
      where.push(`name ILIKE $${params.length}`);
    }
    const sql = `SELECT * FROM products
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id DESC`;
    const { rows } = await query(sql, params);
    return rows.map(mapProduct);
  },

  async findById(id) {
    if (!Number.isInteger(Number(id))) return null;
    const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
    return mapProduct(rows[0]);
  },

  async categories() {
    const { rows } = await query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    return rows.map((r) => r.category);
  },

  async create({ name, description = '', price, category, stock = 0, imageUrl = '' }) {
    const { rows } = await query(
      `INSERT INTO products (name, description, price, category, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), description, price, category.trim(), stock, imageUrl]
    );
    return mapProduct(rows[0]);
  },

  async update(id, fields) {
    const columns = {
      name: 'name',
      description: 'description',
      price: 'price',
      category: 'category',
      stock: 'stock',
      imageUrl: 'image_url',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(columns)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = now()');
    params.push(id);
    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return mapProduct(rows[0]);
  },

  async remove(id) {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

module.exports = Product;
