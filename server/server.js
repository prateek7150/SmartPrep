const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173', 
  process.env.FRONTEND_URL  
];

app.use(cors({
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// --- 2. ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);



mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB Cloud connection successful"))
  .catch((err) => {
    console.error(" Failed to connect to MongoDB:", err.message);
    process.exit(1); 
  });

app.get('/', (req, res) => {
  res.status(200).send("<h1>Smart Prep API is Live & Healthy</h1>");
});

// --- 5. DYNAMIC PORT ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { 
  console.log(` Server is started and is live on PORT ${PORT}`);
});