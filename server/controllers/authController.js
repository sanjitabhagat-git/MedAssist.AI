const pool = require('../db');

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

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

    const user = toSessionUser(rows[0]);
    req.session.user = user;

    return req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);

      return res.json({ message: 'Login successful.', user });
    });
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

    const user = toSessionUser(rows[0]);
    req.session.user = user;

    return req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);

      return res.json({ message: 'Admin login successful.', user });
    });
  } catch (err) {
    next(err);
  }
};

exports.getSessionUser = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No active session.' });
  }

  return res.json({ user: req.session.user });
};

exports.logout = (req, res, next) => {
  if (!req.session) {
    return res.json({ message: 'Logged out successfully.' });
  }

  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'medassist.sid');
    return res.json({ message: 'Logged out successfully.' });
  });
};
