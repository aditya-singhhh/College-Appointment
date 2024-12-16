const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieparser= require('cookie-parser')

const authRoutes = require('./routes/auth');
const professorRoutes = require('./routes/professor');
const studentRoutes = require('./routes/student');

const app = express();
app.use(cookieparser());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/college_appointments', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Routes
app.use('/auth', authRoutes);
app.use('/professor', professorRoutes);
app.use('/student',studentRoutes)

// Server Start
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

module.exports = app;
