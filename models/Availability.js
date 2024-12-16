const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  professorId: String,
  availableSlots: [String],
});

module.exports = mongoose.model('Availability', AvailabilitySchema);
