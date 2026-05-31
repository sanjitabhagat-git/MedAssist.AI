const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const aiRoutes = require('./routes/aiRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'medassist.sid';
const PROTECTED_HTML_PATHS = new Set(['/appointment.html', '/admin-dashboard.html']);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  name: SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET || 'medassist-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use((req, res, next) => {
  if (PROTECTED_HTML_PATHS.has(req.path)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (_, res) => {
  res.json({ message: 'AI Medical Assistant API is running' });
});

app.use('/api/ai', aiRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
