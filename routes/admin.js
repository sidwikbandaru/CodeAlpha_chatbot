// routes/admin.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getStats, getUsers, deleteUser, getRevenue } = require('../controllers/adminController');

// All admin routes require login + admin role
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/revenue', getRevenue);

module.exports = router;
