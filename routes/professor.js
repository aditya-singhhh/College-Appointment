const express = require('express');
const jwt = require('jsonwebtoken');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment'); // Assuming Appointment model is set up
const cookieParser = require('cookie-parser'); // Import cookie-parser to handle cookies
const router = express.Router();

const JWT_SECRET = 'asd'; // Use environment variables for the secret key in production

// Cookie-Parser middleware
router.use(cookieParser());

// Middleware for authenticating professors via cookie
const authenticateProfessor = (req, res, next) => {
  const token = req.cookies['auth_token']; // Extract token from cookies
  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    if (decoded.role !== 'professor') {
      return res.status(403).json({ message: 'Access denied. Only professors can access this route.' });
    }

    req.profID = decoded.userId; // Attach professor ID to the request
    next();
  });
};

// Route to set professor availability
router.post('/availability', authenticateProfessor, async (req, res) => {
  try {
    const { availableSlots } = req.body;

    // Validate availableSlots input
    if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
      return res.status(400).json({ message: 'Available slots must be a non-empty array of strings.' });
    }

    const profID = req.profID; // Get professor ID from authenticated user

    // Upsert availability
    const availability = await Availability.findOneAndUpdate(
      { professorId: profID },
      { professorId: profID, availableSlots },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'Availability updated successfully.',
      availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Route for professor to cancel an appointment with a student
router.delete(
  '/:profId/student/:studentId/cancel',
  authenticateProfessor,
  async (req, res) => {
    const { profId, studentId } = req.params;

    // Ensure the logged-in professor ID matches the route's profId
    if (req.profID !== profId) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to cancel this appointment.',
      });
    }

    try {
      // Find the appointment
      const appointment = await Appointment.findOne({
        professorId: profId,
        studentId: studentId,
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found.' });
      }

      // Cancel the appointment
      await Appointment.deleteOne({ professorId: profId, studentId: studentId });

      res.status(200).json({
        message: `Appointment with Student ${studentId} has been successfully canceled by Professor ${profId}.`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);

module.exports = router;
