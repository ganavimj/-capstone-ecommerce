const express = require('express');
const ctrl = require('../controllers/orderController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, ctrl.create);
router.get('/', requireAuth, ctrl.listMine);
router.get('/all', requireAuth, requireAdmin, ctrl.listAll);
router.get('/:id', requireAuth, ctrl.getOne);
router.put('/:id/status', requireAuth, requireAdmin, ctrl.updateStatus);

module.exports = router;
