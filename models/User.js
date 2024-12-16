const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: String,
  role: String,
  password: String,
});

module.exports = mongoose.model('User', UserSchema);
