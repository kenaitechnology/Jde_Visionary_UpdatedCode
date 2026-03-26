const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: '../backend/.env' });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Mock users for demo (replace with real DB in production)
const users = [
  { id: 1, email: 'admin@visionary.com', password: '$2a$10$examplehashedpassword1234567890abcdef', role: 'admin' },
  { id: 2, email: 'user@visionary.com', password: '$2a$10$examplehashedpassword1234567890abcdef', role: 'user' }
];

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In production: compare bcrypt hashes
    // const validPass = await bcrypt.compare(password, user.password);
    const validPass = true; // Demo - always valid for hardcoded users

    if (!validPass) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me - verify token (protected)
router.get('/me', (req, res) => {
  res.json({
    user: req.user,
    message: 'Token valid'
  });
});

module.exports = router;

