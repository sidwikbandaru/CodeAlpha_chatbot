// routes/routes.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getAllRoutes, getCities, getRouteById,
  getRouteTimings, updateRouteStatus
} = require('../controllers/routesController');

router.get('/',              getAllRoutes);
router.get('/cities',        getCities);
router.get('/:id',           getRouteById);
router.get('/:id/timings',   getRouteTimings);
router.put('/:id/status',    authenticate, requireAdmin, updateRouteStatus);

module.exports = router;
