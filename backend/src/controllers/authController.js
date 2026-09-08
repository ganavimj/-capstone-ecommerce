const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const exists = await User.findByEmail(email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = await User.create({ name, email, password });
  res.status(201).json({ token: signToken(user), user: User.toPublic(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await User.findByEmail(email);
  if (!user || !(await User.verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: signToken(user), user: User.toPublic(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: User.toPublic(req.user) });
});
