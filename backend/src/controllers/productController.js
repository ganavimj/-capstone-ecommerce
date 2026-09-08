const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const products = await Product.list({
    search: req.query.search,
    category: req.query.category,
  });
  res.json(products);
});

exports.getOne = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

exports.categories = asyncHandler(async (req, res) => {
  res.json(await Product.categories());
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock, imageUrl } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: 'name, price and category are required' });
  }
  if (Number(price) < 0 || (stock != null && Number(stock) < 0)) {
    return res.status(400).json({ error: 'price and stock must be non-negative' });
  }
  const product = await Product.create({
    name,
    description,
    price: Number(price),
    category,
    stock: stock == null ? 0 : Number(stock),
    imageUrl,
  });
  res.status(201).json(product);
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Product.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const fields = {};
  for (const key of ['name', 'description', 'price', 'category', 'stock', 'imageUrl']) {
    if (req.body[key] !== undefined) fields[key] = req.body[key];
  }
  if (fields.price !== undefined) fields.price = Number(fields.price);
  if (fields.stock !== undefined) fields.stock = Number(fields.stock);

  const product = await Product.update(req.params.id, fields);
  res.json(product);
});

exports.remove = asyncHandler(async (req, res) => {
  const deleted = await Product.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Product not found' });
  res.json({ ok: true });
});
