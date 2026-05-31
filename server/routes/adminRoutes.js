const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllDoctorsForAdmin,
  addDoctor,
  getDoctorDetailForAdmin
} = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../public/uploads/doctors');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.get('/doctors', requireRole('admin'), getAllDoctorsForAdmin);
router.post('/doctors', requireRole('admin'), upload.single('photo'), addDoctor);
router.get('/doctors/:doctorId', requireRole('admin'), getDoctorDetailForAdmin);
router.put('/doctors/:doctorId', requireRole('admin'), upload.single('photo'), require('../controllers/adminController').updateDoctorForAdmin);
router.delete('/doctors/:doctorId', requireRole('admin'), require('../controllers/adminController').deleteDoctorForAdmin);

module.exports = router;
