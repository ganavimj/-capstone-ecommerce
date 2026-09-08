const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const order = await Order.checkout(req.user.id, req.body.items);
  res.status(201).json(order);
});

exports.listMine = asyncHandler(async (req, res) => {
  res.json(await Order.listByUser(req.user.id));
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const ownerId = order.userId && order.userId.id ? order.userId.id : order.userId;
  if (req.user.role !== 'admin' && Number(ownerId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json(order);
});

exports.listAll = asyncHandler(async (req, res) => {
  res.json(await Order.listAll());
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.updateStatus(req.params.id, req.body.status);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});
