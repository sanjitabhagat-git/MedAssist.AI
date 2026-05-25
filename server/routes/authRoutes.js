const express = require('express');
const { registerPatient, loginPatient, loginAdmin } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);
router.post('/admin/login', loginAdmin);

module.exports = router;
