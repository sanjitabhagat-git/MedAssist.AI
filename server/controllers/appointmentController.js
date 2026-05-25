const PDFDocument = require('pdfkit');
const pool = require('../db');

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

    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.bookAppointment = async (req, res, next) => {
  try {
    const { user_id, doctor_id, appointment_date, appointment_time } = req.body;

    if (!user_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'user_id, doctor_id, appointment_date, appointment_time are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, status)
       VALUES (?, ?, ?, ?, 'booked')`,
      [user_id, doctor_id, appointment_date, appointment_time]
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
    const { userId } = req.params;

    const [rows] = await pool.query(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status,
              d.name AS doctor_name, d.degree, d.fees, d.photo_url, dp.name AS department
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN departments dp ON dp.id = d.department_id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
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
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id query parameter is required.' });
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
      [appointmentId, user_id]
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
