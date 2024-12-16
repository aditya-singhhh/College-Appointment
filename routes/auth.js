const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = 'asd';

// Cookie-Parser middleware
router.use(cookieParser());

// Route for Login
router.post('/login', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    // Validate request
    if (!userId || !password || !role) {
      return res.status(400).json({ message: 'Please provide userId, password, and role' });
    }

    // Find the user by userId and role
    const user = await User.findOne({ userId, role });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    
   // Set token in cookie
res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
;

    res.status(200).json({
      message: 'Authenticated successfully',
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route for Signup
router.post('/signup', async (req, res) => {
  try {
    const { userId, password, role } = req.body;

    // Validate request
    if (!userId || !password || !role) {
      return res.status(400).json({ message: 'Please provide userId, password, and role' });
    }

    // Ensure role is either 'student' or 'professor'
    if (role !== 'student' && role !== 'professor') {
      return res.status(400).json({ message: 'Invalid role. Role must be either "student" or "professor".' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ userId, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { userId: newUser.userId, role: newUser.role }, // Exclude the password
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
