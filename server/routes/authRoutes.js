const express = require('express');
const {
  registerPatient,
  loginPatient,
  loginAdmin,
  getSessionUser,
  logout
} = require('../controllers/authController');
const { requireSession } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);
router.post('/admin/login', loginAdmin);
router.get('/me', requireSession, getSessionUser);
router.post('/logout', requireSession, logout);

module.exports = router;
