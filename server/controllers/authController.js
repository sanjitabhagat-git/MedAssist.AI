const pool = require('../db');

exports.registerPatient = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'name, email, phone and password are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES (?, ?, ?, ?, 'patient')`,
      [name, email, phone, password]
    );

    return res.status(201).json({
      message: 'Registration successful.',
      user: { id: result.insertId, name, email, phone, role: 'patient' }
    });
  } catch (err) {
    next(err);
  }
};

exports.loginPatient = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role
       FROM users
       WHERE email = ? AND password = ? AND role = 'patient'`,
      [email, password]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid patient credentials.' });
    }

    return res.json({ message: 'Login successful.', user: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role
       FROM users
       WHERE email = ? AND password = ? AND role = 'admin'`,
      [email, password]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    return res.json({ message: 'Admin login successful.', user: rows[0] });
  } catch (err) {
    next(err);
  }
};
