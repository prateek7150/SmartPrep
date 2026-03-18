const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',                   
  'https://smart-prep-rouge.vercel.app',     
  process.env.FRONTEND_URL                   
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.endsWith('.vercel.app');

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.log("CORS Blocked Origin:", origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

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
  console.log(` Server is started and is live on PORT ${PORT}`);
  console.log(` Allowing traffic from: ${allowedOrigins.join(', ')}`);
});
