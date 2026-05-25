const express = require('express');
const {
  getDoctorsByDepartment,
  bookAppointment,
  getAppointmentsByUser,
  downloadAppointmentInvoice
} = require('../controllers/appointmentController');

const router = express.Router();

router.get('/doctors', getDoctorsByDepartment);
router.post('/book', bookAppointment);
router.get('/user/:userId', getAppointmentsByUser);
router.get('/:appointmentId/invoice', downloadAppointmentInvoice);

module.exports = router;
