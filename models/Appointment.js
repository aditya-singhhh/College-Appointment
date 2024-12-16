const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  appointmentId: String,
  studentId: String,
  professorId: String,
  timeSlot: String,
  status: String,
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
