// routes/tickets.js
const router = require('express').Router();
const { authenticate }  = require('../middleware/auth');
const {
  bookTicket, getTickets, getTicketById, cancelTicket
} = require('../controllers/ticketsController');

// All ticket routes require login
router.use(authenticate);

router.post('/',              bookTicket);
router.get('/',               getTickets);
router.get('/:id',            getTicketById);
router.patch('/:id/cancel',   cancelTicket);

module.exports = router;
