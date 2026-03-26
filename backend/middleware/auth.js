const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Bearer token missing in Authorization header'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Token expired or invalid signature'
      });
    }
    req.user = user; // { id, email, role }
    next();
  });
}

module.exports = { authenticateToken };

