const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { param, validationResult, body } = require('express-validator');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');

const router = express.Router();
const JWT_SECRET = 'asd';

// Use cookie-parser middleware
router.use(cookieParser());

// Middleware for authenticating students
const authenticateStudent = (req, res, next) => {
  const token = req.cookies['auth_token']; 
  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token.';
      return res.status(401).json({ message });
    }

    if (decoded.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Only students can access this route.' });
    }

    req.studentId = decoded.userId;
    next();
  });
};

// Route for Student vieweing professor's available slots
router.get(
  '/:studentId/professor/:profId/availability',
  [
    param('studentId').isAlphanumeric().withMessage('Invalid student ID format.'),
    param('profId').isAlphanumeric().withMessage('Invalid professor ID format.'),
  ],
  authenticateStudent,
  async (req, res) => {
    // Validate input parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, profId } = req.params;

    // Ensure the logged-in student ID matches the route's studentId
    if (req.studentId !== studentId) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to view this information.',
      });
    }

    try {
      // Check professor's availability
      const availability = await Availability.findOne({ professorId: profId }).select('availableSlots');

      if (!availability || !availability.availableSlots?.length) {
        return res.status(404).json({ message: 'No available slots found for this professor.' });
      }

      // Respond with available slots
      res.status(200).json({
        message: 'Available slots fetched successfully.',
        availableSlots: availability.availableSlots,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);

// Route for Student to book an appointment with a professor for a specific time slot
router.post(
  '/:studentId/professor/:profId/book',
  [
    param('studentId').isAlphanumeric().withMessage('Invalid student ID format.'),
    param('profId').isAlphanumeric().withMessage('Invalid professor ID format.'),
    body('time').isString().withMessage('Time slot must be provided as a string.'),
  ],
  authenticateStudent,
  async (req, res) => {
    // Validate input parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, profId } = req.params;
    const { time } = req.body;

    // Check logged-in student ID matches the route's studentId
    if (req.studentId !== studentId) {
      return res.status(403).json({
        message: 'Access denied. You can only book appointments for yourself.',
      });
    }

    try {
      // Check professor's availability
      const availability = await Availability.findOne({ professorId: profId });
      if (!availability) {
        return res.status(404).json({ message: `No availability found for Professor ${profId}.` });
      }

      // Check if the requested time slot is available
      const slotIndex = availability.availableSlots.indexOf(time);
      if (slotIndex === -1) {
        return res.status(404).json({ message: `Slot ${time} is not available for Professor ${profId}.` });
      }

      // Book the appointment with professor
      availability.availableSlots.splice(slotIndex, 1); 
      await availability.save();

      // Create a new appointment in the database
      const newAppointment = new Appointment({
        studentId,
        professorId: profId,
        time,
        status: 'pending', // Status can be 'pending', 'confirmed', etc.
      });
      await newAppointment.save();

      res.status(201).json({
        message: `Appointment booked successfully. Student ${studentId} with Professor ${profId} at ${time}.`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);

// Route for Student to view professor's availability
router.get(
  '/:studID/appointments',
  [
    param('studID').isAlphanumeric().withMessage('Invalid student ID format.'),
  ],
  authenticateStudent,
  async (req, res) => {
    // Validate input parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studID } = req.params;

    // Check logged-in student ID matches the route's studID
    if (req.studentId !== studID) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own appointments.',
      });
    }

    try {
      // Check pending appointments for the student
      const appointments = await Appointment.find({
        studentId: studID,
        status: 'pending',
      }).select('professorId timeSlot status'); // Use timeSlot explicitly

      if (!appointments.length) {
        return res.status(404).json({ message: 'No pending appointments found.' });
      }

      // Respond with the student's pending appointments, including time slots
      res.status(200).json({
        message: 'Pending appointments fetched successfully.',
        appointments, // Includes professorId, timeSlot, and status
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);



module.exports = router;
