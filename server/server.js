const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://localhost:5173'
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const academicRoutes = require('./routes/academicRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Routes
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Theebam Education Centre API is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
