const express = require('express');
const {
  getDoctorsByDepartment,
  bookAppointment,
  getAppointmentsByUser,
  downloadAppointmentInvoice
} = require('../controllers/appointmentController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/doctors', requireRole('patient'), getDoctorsByDepartment);
router.post('/book', requireRole('patient'), bookAppointment);
router.get('/user', requireRole('patient'), getAppointmentsByUser);
router.get('/:appointmentId/invoice', requireRole('patient'), downloadAppointmentInvoice);

module.exports = router;
