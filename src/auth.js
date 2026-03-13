const jwt = require('jsonwebtoken');

function signAdminToken(adminId, secret, expiresIn) {
  return jwt.sign({ role: 'admin', adminId }, secret, { expiresIn });
}

function requireAdmin(secret) {
  return function adminMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    try {
      const payload = jwt.verify(token, secret);
      if (payload.role !== 'admin') {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }
      req.admin = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Невалидный токен' });
    }
  };
}

module.exports = { signAdminToken, requireAdmin };
