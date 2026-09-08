const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const STATUSES = ['pending', 'shipped', 'delivered'];

exports.create = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  // Collapse duplicate productIds and validate quantities.
  const wanted = new Map();
  for (const raw of items) {
    const id = String(raw.productId || '');
    const qty = Number(raw.quantity);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: `Invalid productId: ${id}` });
    }
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: `Invalid quantity for product ${id}` });
    }
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  if (products.length !== wanted.size) {
    return res.status(404).json({ error: 'One or more products no longer exist' });
  }

  const orderItems = [];
  let totalAmount = 0;
  for (const product of products) {
    const qty = wanted.get(String(product._id));
    if (product.stock < qty) {
      return res
        .status(400)
        .json({ error: `Not enough stock for "${product.name}" (have ${product.stock})` });
    }
    orderItems.push({
      productId: product._id,
      name: product.name,
      quantity: qty,
      priceAtPurchase: product.price,
    });
    totalAmount += product.price * qty;
  }

  // Decrement stock, then create the order.
  await Promise.all(
    products.map((p) =>
      Product.updateOne({ _id: p._id }, { $inc: { stock: -wanted.get(String(p._id)) } })
    )
  );

  const order = await Order.create({
    userId: req.user._id,
    items: orderItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    paymentStatus: 'paid',
    status: 'pending',
  });

  res.status(201).json(order);
});

exports.listMine = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('userId', 'name email');
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const ownerId = order.userId._id ? order.userId._id : order.userId;
  if (req.user.role !== 'admin' && String(ownerId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json(order);
});

exports.listAll = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('userId', 'name email').sort({ createdAt: -1 });
  res.json(orders);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('userId', 'name email');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});
