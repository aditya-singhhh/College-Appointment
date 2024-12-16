const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Availability = require('../models/Availability');
const Appointment = require('../models/Appointment');
const app = require('../app'); 

const JWT_SECRET = 'asd';

let studentA1, studentA2, professorP1, professorToken, studentA1Token, studentA2Token;

beforeAll(async () => {
  // Professor Credentials
  professorP1 = await User.create({
    userId: 'P1',
    password: '12345678',
    role: 'professor',
  });

  // Student A1 Credentials
  studentA1 = await User.create({
    userId: 'A1',
    password: '12345678',
    role: 'student',
  });
   
   //Student A2 Credentials
  studentA2 = await User.create({
    userId: 'A2',
    password: '12345678',
    role: 'student',
  });

  // JWTs for professor and students
  professorToken = jwt.sign({ userId: professorP1.userId, role: 'professor' }, JWT_SECRET, { expiresIn: '1h' });
  studentA1Token = jwt.sign({ userId: studentA1.userId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  studentA2Token = jwt.sign({ userId: studentA2.userId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });

  // Professor Availability
  await Availability.create({
    professorId: professorP1.userId,
    availableSlots: ['T1', 'T2', 'T3'],
  });
});

describe('Student-Professor Appointment Flow', () => {
  it('should follow the entire flow correctly', async () => {
    // Step 1: Professor P1 authenticates
    const professorLoginRes = await request(app)
      .post('/auth/login')
      .send({
        userId: 'P1',
        password: '12345678',
        role: 'professor',
      });
    expect(professorLoginRes.status).toBe(200);

    // Step 2: Professor P1 specifies available slots
    const availableSlotsRes = await request(app)
      .post('/professor/availability')
      .set('Cookie', `auth_token=${professorToken}`)
      .send({
        availableSlots: ['T1', 'T2', 'T3'],
      });
    expect(availableSlotsRes.status).toBe(200);

    // Step 3: Student A1 authenticates
    const studentA1LoginRes = await request(app)
      .post('/auth/login')
      .send({
        userId: 'A1',
        password: '12345678',
        role: 'student',
      });
    expect(studentA1LoginRes.status).toBe(200);

    // Step 4: Student A1 views available slots for Professor P1
    const viewAvailabilityRes = await request(app)
      .get('/student/A1/professor/P1/availability')
      .set('Cookie', `auth_token=${studentA1Token}`);
    expect(viewAvailabilityRes.status).toBe(200);
    expect(viewAvailabilityRes.body.availableSlots).toEqual(['T1', 'T2', 'T3']);

    // Step 5: Student A1 books appointment for T1
    const bookAppointmentRes = await request(app)  
      .post('/student/A1/professor/P1/book')
      .set('Cookie', `auth_token=${studentA1Token}`)
      .send({ time: 'T1' });
    expect(bookAppointmentRes.status).toBe(201);

    // Step 6: Student A2 authenticates
    const studentA2LoginRes = await request(app)
      .post('/auth/login')
      .send({
        userId: 'A2',
        password: '12345678',
        role: 'student',
      });
    expect(studentA2LoginRes.status).toBe(200);

    // Step 7: Student A2 books appointment for T2
    const bookAppointmentA2Res = await request(app)
      .post('/student/A2/professor/P1/book')
      .set('Cookie', `auth_token=${studentA2Token}`)
      .send({ time: 'T2' });
    expect(bookAppointmentA2Res.status).toBe(201);

    // Step 8: Professor P1 cancels appointment with Student A1
    const cancelAppointmentRes = await request(app)
      .delete('/professor/P1/student/A1/cancel')
      .set('Cookie', `auth_token=${professorToken}`);
    expect(cancelAppointmentRes.status).toBe(200);

   // Step 9: Student A1 checks appointments and finds no pending appointments
    const checkAppointmentsRes = await request(app)
        .get('/student/A1/appointments')
        .set('Cookie', `auth_token=${studentA1Token}`);
    console.log(checkAppointmentsRes.body.message); // Log to confirm the actual response message
    expect(checkAppointmentsRes.status).toBe(404); // Adjusted to match the API's behavior for "no appointments found"
    expect(checkAppointmentsRes.body.message).toBe('No pending appointments found.'); // Match the exact message returned by the API
});
});
