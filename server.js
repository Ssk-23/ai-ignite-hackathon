const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const isProduction = process.env.NODE_ENV === 'production';
const mongodbUri = process.env.MONGODB_URI || (isProduction ? null : 'mongodb://localhost:27017/hackathon');

console.log('Connecting to MongoDB:', mongodbUri ? 'URI set' : 'URI NOT set');
if (mongodbUri) {
  mongoose.connect(mongodbUri)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('⚠️ API will return 503 until database is connected.');
    });
} else {
  console.error('❌ MONGODB_URI is missing. API routes will return 503.');
}

mongoose.connection.on('disconnected', () => {
  console.error('❌ MongoDB disconnected. API routes will return 503.');
});

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

function hasValidRegistrationBody(body) {
  const { name, email, phone, college, teamName, teamSize } = body;
  const parsedTeamSize = Number(teamSize);

  return Boolean(
    name &&
    email &&
    phone &&
    college &&
    teamName &&
    Number.isInteger(parsedTeamSize) &&
    parsedTeamSize >= 1 &&
    parsedTeamSize <= 4
  );
}

// Registration Model
const registrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  college: String,
  teamName: String,
  teamSize: Number,
  createdAt: { type: Date, default: Date.now },
});

const Registration = mongoose.model('Registration', registrationSchema);

// API Routes

app.get('/api/health', (req, res) => {
  const dbConnected = isDatabaseConnected();
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    database: dbConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Create Registration
app.post('/api/register', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, error: 'Database is not connected. Try again in a moment.' });
    }

    if (!hasValidRegistrationBody(req.body)) {
      return res.status(400).json({ success: false, error: 'Invalid registration data' });
    }

    const { name, email, phone, college, teamName, teamSize } = req.body;

    // Create registration
    const registration = new Registration({
      name,
      email,
      phone,
      college,
      teamName,
      teamSize,
    });

    await registration.save();

    res.json({
      success: true,
      registrationId: registration._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get All Registrations (Admin)
app.get('/api/registrations', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, error: 'Database is not connected. Try again in a moment.' });
    }

    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return JSON for unknown API routes instead of HTML.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Ensure malformed JSON/request errors are returned in JSON format.
app.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  if (req.path.startsWith('/api')) {
    return res.status(error.status || 500).json({
      success: false,
      error: error.type === 'entity.parse.failed' ? 'Invalid JSON payload' : error.message,
    });
  }

  return next(error);
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
