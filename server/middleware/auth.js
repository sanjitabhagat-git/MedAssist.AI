function requireSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }

    next();
  };
}

module.exports = {
  requireSession,
  requireRole
};
