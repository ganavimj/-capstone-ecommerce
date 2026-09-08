const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.name = { $regex: String(search).trim(), $options: 'i' };

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});

exports.getOne = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

exports.categories = asyncHandler(async (req, res) => {
  const cats = await Product.distinct('category');
  res.json(cats.sort());
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock, imageUrl } = req.body;
  if (!name || price == null || !category) {
    return res.status(400).json({ error: 'name, price and category are required' });
  }
  const product = await Product.create({
    name,
    description,
    price,
    category,
    stock: stock ?? 0,
    imageUrl,
  });
  res.status(201).json(product);
});

exports.update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'price', 'category', 'stock', 'imageUrl'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const product = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ ok: true });
});
