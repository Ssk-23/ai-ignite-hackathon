const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

const REGISTRATION_FEE_INR = 500;
const REGISTRATION_FEE_PAISE = REGISTRATION_FEE_INR * 100;

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

// Razorpay Instance (optional - only initialize if keys are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
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

function isPaymentSignatureValid(orderId, paymentId, signature) {
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${orderId}|${paymentId}`);
  return hmac.digest('hex') === signature;
}

// Registration Model
const registrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  college: String,
  teamName: String,
  teamSize: Number,
  paymentId: String,
  orderId: String,
  amount: Number,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const Registration = mongoose.model('Registration', registrationSchema);

// API Routes

// 1. Create Registration & Order
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
      amount: REGISTRATION_FEE_PAISE,
      status: razorpay ? 'pending' : 'completed', // Auto-complete if no payment
    });

    await registration.save();

    // Create Razorpay order only if Razorpay is configured
    let orderId = null;
    if (razorpay) {
      const options = {
        amount: REGISTRATION_FEE_PAISE,
        currency: 'INR',
        receipt: registration._id.toString(),
      };

      const order = await razorpay.orders.create(options);
      orderId = order.id;
      registration.orderId = order.id;
      await registration.save();
    }

    res.json({
      success: true,
      orderId: orderId,
      registrationId: registration._id,
      amount: REGISTRATION_FEE_PAISE,
      currency: 'INR',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { paymentId, orderId, signature, registrationId } = req.body;

    if (isPaymentSignatureValid(orderId, paymentId, signature)) {
      // Update registration status
      const registration = await Registration.findByIdAndUpdate(
        registrationId,
        { paymentId, status: 'completed' },
        { new: true }
      );

      res.json({ success: true, registration });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    registrationFeeInr: REGISTRATION_FEE_INR,
  });
});

// 3. Get All Registrations (Admin)
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
