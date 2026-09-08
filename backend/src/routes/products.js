const express = require('express');
const ctrl = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/meta/categories', ctrl.categories);
router.get('/:id', ctrl.getOne);

router.post('/', requireAuth, requireAdmin, ctrl.create);
router.put('/:id', requireAuth, requireAdmin, ctrl.update);
router.delete('/:id', requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
