const PDFDocument = require('pdfkit');
const pool = require('../db');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function formatTime(time) {
  const [hours, minutes] = String(time).split(':');
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)} to ${formatTime(endTime)}`;
}

function formatAvailability(availability, fallback = '') {
  if (!availability.length) return fallback;
  return availability
    .map((item) => `${item.day_of_week} - ${formatTime(item.start_time)} to ${formatTime(item.end_time)}`)
    .join('\n');
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

function getDayName(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

function isPastDate(dateValue) {
  const selected = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today;
}

exports.getDoctorsByDepartment = async (req, res, next) => {
  try {
    const { department } = req.query;

    if (!department) {
      return res.status(400).json({ error: 'department query parameter is required.' });
    }

    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.degree, d.fees, d.available_schedule, d.photo_url, dp.name AS department
       FROM doctors d
       JOIN departments dp ON dp.id = d.department_id
       WHERE dp.name = ?`,
      [department]
    );

    return res.json(await attachAvailability(rows));
  } catch (err) {
    next(err);
  }
};

exports.bookAppointment = async (req, res, next) => {
  try {
    const sessionUser = req.session && req.session.user;
    const { user_id, doctor_id, appointment_date, appointment_time } = req.body;
    const resolvedUserId = sessionUser ? sessionUser.id : user_id;

    if (!resolvedUserId || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'doctor_id, appointment_date and appointment_time are required.' });
    }

    if (isPastDate(appointment_date)) {
      return res.status(400).json({ error: 'Appointment date cannot be in the past.' });
    }

    const dayOfWeek = getDayName(appointment_date);
    const [availability] = await pool.query(
      `SELECT id, start_time, end_time
       FROM doctor_availability
       WHERE doctor_id = ?
         AND day_of_week = ?`,
      [doctor_id, dayOfWeek]
    );

    if (!availability.length) {
      return res.status(400).json({ error: `Selected time slot is not available for this doctor on ${dayOfWeek}.` });
    }

    const matchedSlot = availability.find(
      (slot) => formatTimeRange(slot.start_time, slot.end_time) === appointment_time
    );

    if (!matchedSlot) {
      return res.status(400).json({ error: `Selected time slot is not available for this doctor on ${dayOfWeek}.` });
    }

    const appointmentTimeLabel = formatTimeRange(matchedSlot.start_time, matchedSlot.end_time);

    const [existing] = await pool.query(
      `SELECT id
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status = 'booked'
       LIMIT 1`,
      [doctor_id, appointment_date, appointmentTimeLabel]
    );

    if (existing.length) {
      return res.status(409).json({ error: 'This appointment slot has already been booked.' });
    }

    const [result] = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, status)
       VALUES (?, ?, ?, ?, 'booked')`,
      [resolvedUserId, doctor_id, appointment_date, appointmentTimeLabel]
    );

    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment_id: result.insertId
    });
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentsByUser = async (req, res, next) => {
  try {
    const sessionUser = req.session && req.session.user;
    const userId = sessionUser && sessionUser.id;

    if (!userId) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status,
              d.name AS doctor_name, d.degree, d.fees, d.photo_url, dp.name AS department
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN departments dp ON dp.id = d.department_id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [userId]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.downloadAppointmentInvoice = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const sessionUser = req.session && req.session.user;
    const userId = sessionUser && sessionUser.id;

    if (!userId) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status,
              u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
              d.name AS doctor_name, d.degree, d.fees, d.photo_url, dp.name AS department
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN departments dp ON dp.id = d.department_id
       WHERE a.id = ? AND a.user_id = ?`,
      [appointmentId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Appointment not found for this user.' });
    }

    const booking = rows[0];
    const doctorFee = Number(booking.fees);
    const gstAmount = doctorFee * 0.05;
    const totalAmount = doctorFee + gstAmount;

    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoice_appointment_${booking.id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    doc.fontSize(20).text('Medical Appointment Invoice', { align: 'center' });
    doc.moveDown();

    if (booking.photo_url) {
      try {
        const response = await fetch(booking.photo_url);
        if (response.ok) {
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          doc.image(imageBuffer, 50, 110, { fit: [100, 100] });
        }
      } catch (_err) {
        // Skip doctor photo if it cannot be loaded.
      }
    }

    doc.fontSize(12).text(`Invoice ID: INV-${booking.id}`, 170, 120);
    doc.text(`Appointment ID: ${booking.id}`, 170, 140);
    doc.text(`Appointment Date: ${formatDate(booking.appointment_date)}`, 170, 160);
    doc.text(`Selected Time: ${booking.appointment_time}`, 170, 180);

    doc.moveDown(6);
    doc.fontSize(14).text('Doctor Details', { underline: true });
    doc.fontSize(12).text(`Name: ${booking.doctor_name}`);
    doc.text(`Degree: ${booking.degree}`);
    doc.text(`Department: ${booking.department}`);
    doc.text(`Consultation Fee: INR ${formatMoney(doctorFee)}`);

    doc.moveDown();
    doc.fontSize(14).text('Patient Details', { underline: true });
    doc.fontSize(12).text(`Name: ${booking.patient_name}`);
    doc.text(`Email: ${booking.patient_email}`);
    doc.text(`Phone: ${booking.patient_phone}`);

    doc.moveDown();
    doc.fontSize(14).text('Payment Summary', { underline: true });
    doc.fontSize(12).text(`Base Fee: INR ${formatMoney(doctorFee)}`);
    doc.text(`GST (5%): INR ${formatMoney(gstAmount)}`);
    doc.font('Helvetica-Bold').text(`Total Amount: INR ${formatMoney(totalAmount)}`);

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text('Thank you for booking with us.', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
};
