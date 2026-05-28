const pool = require('../db');

const VALID_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function formatTime(time) {
  const [hours, minutes] = String(time).split(':');
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatAvailability(availability, fallback = '') {
  if (!availability.length) return fallback;
  return availability
    .map((item) => `${item.day_of_week} - ${formatTime(item.start_time)} to ${formatTime(item.end_time)}`)
    .join('\n');
}

function normalizeAvailability(body) {
  const days = toArray(body.availability_day);
  const starts = toArray(body.start_time);
  const ends = toArray(body.end_time);

  return days.map((day, index) => ({
    day_of_week: day,
    start_time: starts[index],
    end_time: ends[index]
  })).filter((item) => item.day_of_week || item.start_time || item.end_time);
}

function validateAvailability(availability) {
  if (!availability.length) return 'At least one availability day and time slot is required.';

  for (const item of availability) {
    if (!VALID_DAYS.includes(item.day_of_week) || !item.start_time || !item.end_time) {
      return 'Each availability row needs a valid day, start time and end time.';
    }

    if (item.start_time >= item.end_time) {
      return 'Availability end time must be later than start time.';
    }
  }

  return null;
}

async function attachAvailability(doctors) {
  if (!doctors.length) return doctors;

  const ids = doctors.map((doctor) => doctor.id);
  const [slots] = await pool.query(
    `SELECT doctor_id, day_of_week, TIME_FORMAT(start_time, '%H:%i') AS start_time,
            TIME_FORMAT(end_time, '%H:%i') AS end_time
     FROM doctor_availability
     WHERE doctor_id IN (?)
     ORDER BY FIELD(day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), start_time`,
    [ids]
  );

  const slotsByDoctor = slots.reduce((acc, slot) => {
    acc[slot.doctor_id] = acc[slot.doctor_id] || [];
    acc[slot.doctor_id].push({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time
    });
    return acc;
  }, {});

  return doctors.map((doctor) => {
    const availability = slotsByDoctor[doctor.id] || [];
    return {
      ...doctor,
      availability,
      available_schedule: formatAvailability(availability, doctor.available_schedule)
    };
  });
}

exports.getAllDoctorsForAdmin = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.degree, d.fees, d.available_schedule, d.photo_url, dp.name AS department
       FROM doctors d
       JOIN departments dp ON dp.id = d.department_id
       ORDER BY d.id DESC`
    );

    return res.json(await attachAvailability(rows));
  } catch (err) {
    next(err);
  }
};

exports.addDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { name, department, degree, fees } = req.body;
    const availability = normalizeAvailability(req.body);
    const availabilityError = validateAvailability(availability);

    if (!name || !department || !degree || !fees) {
      return res.status(400).json({ error: 'name, department, degree and fees are required.' });
    }

    if (availabilityError) {
      return res.status(400).json({ error: availabilityError });
    }

    const [departments] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);

    if (!departments.length) {
      return res.status(400).json({ error: 'Invalid department.' });
    }

    const photoUrl = req.file ? `/uploads/doctors/${req.file.filename}` : null;
    const availableSchedule = formatAvailability(availability);

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO doctors (department_id, name, degree, fees, available_schedule, photo_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [departments[0].id, name, degree, Number(fees), availableSchedule, photoUrl]
    );

    await connection.query(
      `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
       VALUES ?`,
      [availability.map((item) => [result.insertId, item.day_of_week, item.start_time, item.end_time])]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Doctor added successfully.',
      doctor_id: result.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
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

    const [doctor] = await attachAvailability(doctorRows);

    return res.json({ doctor, appointments });
  } catch (err) {
    next(err);
  }
};

exports.updateDoctorForAdmin = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { doctorId } = req.params;
    const { name, department, degree, fees } = req.body;
    const availability = normalizeAvailability(req.body);
    const availabilityError = validateAvailability(availability);

    if (!name || !department || !degree || !fees) {
      return res.status(400).json({ error: 'name, department, degree and fees are required.' });
    }

    if (availabilityError) {
      return res.status(400).json({ error: availabilityError });
    }

    const [departments] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (!departments.length) return res.status(400).json({ error: 'Invalid department.' });

    const photoUrl = req.file ? `/uploads/doctors/${req.file.filename}` : null;
    const availableSchedule = formatAvailability(availability);

    await connection.beginTransaction();

    const updateFields = [departments[0].id, name, degree, Number(fees), availableSchedule];
    let updateSql = `UPDATE doctors SET department_id = ?, name = ?, degree = ?, fees = ?, available_schedule = ?`;
    if (photoUrl) {
      updateSql += `, photo_url = ?`;
      updateFields.push(photoUrl);
    }
    updateSql += ` WHERE id = ?`;
    updateFields.push(doctorId);

    await connection.query(updateSql, updateFields);

    // replace availability
    await connection.query('DELETE FROM doctor_availability WHERE doctor_id = ?', [doctorId]);
    if (availability.length) {
      await connection.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ?`,
        [availability.map((item) => [doctorId, item.day_of_week, item.start_time, item.end_time])]
      );
    }

    await connection.commit();

    return res.json({ message: 'Doctor updated successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

exports.deleteDoctorForAdmin = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { doctorId } = req.params;

    // check for upcoming booked appointments
    const [upcoming] = await connection.query(
      `SELECT COUNT(*) AS cnt FROM appointments WHERE doctor_id = ? AND status = 'booked' AND appointment_date >= CURDATE()`,
      [doctorId]
    );

    if (upcoming[0].cnt > 0) {
      return res.status(400).json({ error: 'Doctor cannot be deleted: there are upcoming booked appointments.' });
    }

    await connection.beginTransaction();

    // remove any appointments (completed/cancelled) related to this doctor so delete can proceed
    await connection.query('DELETE FROM appointments WHERE doctor_id = ?', [doctorId]);

    // doctor_availability will cascade on delete, but remove explicitly
    await connection.query('DELETE FROM doctor_availability WHERE doctor_id = ?', [doctorId]);

    await connection.query('DELETE FROM doctors WHERE id = ?', [doctorId]);

    await connection.commit();

    return res.json({ message: 'Doctor deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
