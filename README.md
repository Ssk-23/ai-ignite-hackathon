# HKBK College Hackathon Registration Website

A complete hackathon registration website with Razorpay payment integration built with Node.js, Express, and MongoDB.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Payments**: Razorpay

## Project Structure

```
├── server.js                 # Main Express server
├── public/
│   ├── index.html           # Registration form page
│   ├── style.css            # Styling
│   └── script.js            # Frontend logic & payment handling
├── .env                     # Environment variables (create this)
├── package.json             # Dependencies
└── .gitignore
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Go to [mongodb.com/cloud](https://mongodb.com/cloud)
2. Create free account
3. Create a cluster
4. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/hackathon`
5. Update `.env` file

**Option B: Local MongoDB**
- Install MongoDB locally
- Use: `mongodb://localhost:27017/hackathon`

### 3. Set Up Razorpay

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Create account
3. Go to Settings → API Keys
4. Copy your **Key ID** and **Key Secret**
5. Update `.env` file

### 4. Update .env File

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackathon
RAZORPAY_KEY_ID=your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_key_secret
PORT=5000
```

### 5. Run the Server

**Development (auto-reload):**
```bash
npm run dev
```
(Install nodemon: `npm install -D nodemon`)

**Production:**
```bash
npm start
```

The server runs on `http://localhost:5000`

## Features

✅ Team registration form
✅ Razorpay payment integration
✅ MongoDB database storage
✅ Payment verification
✅ Registration confirmation
✅ Admin view (GET `/api/registrations`)
✅ Responsive design

## API Endpoints

### Register & Create Payment Order
```
POST /api/register
Body: {
  name: string,
  email: string,
  phone: string,
  college: string,
  teamName: string,
  teamSize: number (1-4)
}
Response: {
  success: true,
  orderId: string,
  registrationId: string,
  amount: number,
  currency: string
}
```

### Verify Payment
```
POST /api/verify-payment
Body: {
  paymentId: string,
  orderId: string,
  signature: string,
  registrationId: string
}
Response: {
  success: true,
  registration: object
}
```

### Get All Registrations (Admin)
```
GET /api/registrations
Response: [array of registrations]
```

### Public Config
```
GET /api/config
Response: {
  razorpayKeyId: string,
  registrationFeeInr: number
}
```

## Deployment Options

### Heroku
```bash
heroku create
git push heroku main
```

### Vercel (with serverless backend)
- Frontend on Vercel
- Backend on Railway/Render/Heroku

### DigitalOcean/AWS
- Traditional VPS deployment

## Important Notes

- Update the team registration fee constant in `server.js` if needed (currently ₹500)
- Test with Razorpay test keys first
- Add email notifications later if needed
- Keep `.env` file secret, never commit it

## Next Steps

1. ✅ Set up MongoDB and get URI
2. ✅ Set up Razorpay and get API keys
3. ✅ Update `.env` file
4. ✅ Run `npm start`
5. ✅ Test registration at `http://localhost:5000`
6. ✅ Deploy to hosting platform

## Support

For issues:
- Check MongoDB connection
- Verify Razorpay API keys
- Check browser console for JS errors
- Check server logs for backend errors

Good luck with the hackathon! 🚀
