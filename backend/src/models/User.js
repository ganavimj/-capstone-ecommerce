const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// DB row (snake_case) -> API object (camelCase, with _id alias the frontend expects).
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

const User = {
  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [
      String(email).toLowerCase().trim(),
    ]);
    return mapUser(rows[0]);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return mapUser(rows[0]);
  },

  async create({ name, email, password, role = 'customer' }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), String(email).toLowerCase().trim(), passwordHash, role]
    );
    return mapUser(rows[0]);
  },

  verifyPassword(user, plain) {
    return bcrypt.compare(plain, user.passwordHash);
  },

  toPublic(user) {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },
};

module.exports = User;
