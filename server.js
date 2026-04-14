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
console.log('Connecting to MongoDB:', process.env.MONGODB_URI ? 'URI set' : 'URI NOT set');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

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

// Create Registration
app.post('/api/register', async (req, res) => {
  try {
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
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
