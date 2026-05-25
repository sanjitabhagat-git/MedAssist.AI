const pool = require('../db');

exports.getAllDoctorsForAdmin = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.degree, d.fees, d.available_schedule, d.photo_url, dp.name AS department
       FROM doctors d
       JOIN departments dp ON dp.id = d.department_id
       ORDER BY d.id DESC`
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.addDoctor = async (req, res, next) => {
  try {
    const { name, department, degree, fees, available_schedule } = req.body;

    if (!name || !department || !degree || !fees || !available_schedule) {
      return res.status(400).json({ error: 'name, department, degree, fees and available_schedule are required.' });
    }

    const [departments] = await pool.query('SELECT id FROM departments WHERE name = ?', [department]);

    if (!departments.length) {
      return res.status(400).json({ error: 'Invalid department.' });
    }

    const photoUrl = req.file ? `/uploads/doctors/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO doctors (department_id, name, degree, fees, available_schedule, photo_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [departments[0].id, name, degree, Number(fees), available_schedule, photoUrl]
    );

    return res.status(201).json({
      message: 'Doctor added successfully.',
      doctor_id: result.insertId
    });
  } catch (err) {
    next(err);
  }
};

exports.getDoctorDetailForAdmin = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const [doctorRows] = await pool.query(
      `SELECT d.id, d.name, d.degree, d.fees, d.available_schedule, d.photo_url, dp.name AS department
       FROM doctors d
       JOIN departments dp ON dp.id = d.department_id
       WHERE d.id = ?`,
      [doctorId]
    );

    if (!doctorRows.length) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const [appointments] = await pool.query(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status,
              u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [doctorId]
    );

    return res.json({ doctor: doctorRows[0], appointments });
  } catch (err) {
    next(err);
  }
};
