const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAllDoctorsForAdmin,
  addDoctor,
  getDoctorDetailForAdmin
} = require('../controllers/adminController');

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

router.get('/doctors', getAllDoctorsForAdmin);
router.post('/doctors', upload.single('photo'), addDoctor);
router.get('/doctors/:doctorId', getDoctorDetailForAdmin);
router.put('/doctors/:doctorId', upload.single('photo'), require('../controllers/adminController').updateDoctorForAdmin);
router.delete('/doctors/:doctorId', require('../controllers/adminController').deleteDoctorForAdmin);

module.exports = router;
