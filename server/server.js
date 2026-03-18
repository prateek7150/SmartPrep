const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();

// 1. DYNAMIC ORIGIN LOGIC
const allowedOrigins = [
  'http://localhost:5173',
  'https://smart-prep-rouge.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isVercelPreview = origin.endsWith('.vercel.app');
    const isAllowedOrigin = allowedOrigins.includes(origin);

    if (isAllowedOrigin || isVercelPreview) {
      callback(null, true);
    } else {
      console.log("CORS Blocked Origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 2. APPLY CORS BEFORE ALL OTHER MIDDLEWARE
app.use(cors(corsOptions));

// 3. EXPLICIT OPTIONS HANDLER (FOR PREFLIGHT)
app.options('*', cors(corsOptions)); 

app.use(express.json());

// 4. ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);

app.get('/', (req, res) => {
  res.status(200).send("<h1>Smart Prep API is Live & Healthy</h1>");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Cloud connection successful"))
  .catch((err) => {
    console.error(" Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server started on PORT ${PORT}`);
});
