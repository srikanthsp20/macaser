/**
 * Mangalam Catering Services – Node.js/Express Server
 * ----------------------------------------------------
 * Serves the frontend (public/) and handles operational requests.
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const cors     = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// Enable cross-device processing middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend assets directly from root or public folder
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

/* ── IN-MEMORY PERSISTENT STORE (Blueprint for Global Operations) ── */
let DATA_STORE = {
  users: [],
  orders: [],
  menuItems: [
    { id: "1", name: "Idli Sambar", type: "Breakfast", price: 80, desc: "Soft fluffy steamed rice cakes served with authentic sambar." },
    { id: "2", name: "Masala Dosa", type: "Breakfast", price: 100, desc: "Crispy crepe filled with lightly spiced potato mash." },
    { id: "3", name: "South Indian Meals", type: "Lunch", price: 150, desc: "Rice, Sambar, Rasam, Kootu, Poriyal, Curd, and Appalam." },
    { id: "4", name: "Veg Biryani", type: "Dinner", price: 140, desc: "Fragrant basmati rice cooked with assorted vegetables and spices." }
  ],
  combos: [],
  adminPassword: "admin"
};

/* ── PAGE BASE ROUTE ─────────────────────────────────────────── */
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'index.html'));
});
/* ── MULTER HARD DRIVE ALLOCATION ── */
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Prefix filenames with a timestamp to prevent overwriting duplicate files
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limits
});

/* ── UPLOAD ENDPOINT ROUTE ── */
// 'upload.single('image')' MUST capture the exact key string sent via your FormData
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file reached the server pipeline.' });
    }
    
    // Construct the static file path string
    const relativeUrlPath = '/uploads/' + req.file.filename;
    
    res.json({
      success: true,
      message: 'Asset saved successfully.',
      url: relativeUrlPath
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});






/* ── MULTER STORAGE CONFIGURATION ── */
/*const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generates a unique timeline timestamp prefix to avoid filename collision drops
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit cap
});
*/
/* ── MULTIPART FILE UPLOAD ENDPOINT ── */
// Ensure 'image' matches the name appended inside formData in your frontend index.html script block!
/*app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file received by backend server structure.' });
    }
    
    // Generates the static file relative url link
    const fileUrl = '/uploads/' + req.file.filename;
    
    res.json({
      success: true,
      message: 'Asset verified and saved.',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


const express = require('express');
const multer = require('multer');*/
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
/*const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
*/
/* ── CLOUDINARY CONFIGURATION ── */
// Get these free credentials by signing up at Cloudinary.com
/*cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME || 'dosxpozyt',
  api_key:    process.env.CLOUDINARY_KEY  || '231858439383224',
  api_secret: process.env.CLOUDINARY_SECRET || '*********************************'
});
*/
/* ── ROUTE MULTER STORAGE DIRECTLY TO THE CLOUD ── */
const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mangalam_menu', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 400, crop: 'limit' }] // Auto-resizes for fast mobile loading
  }
});

const upload = multer({ storage: cloudStorage });

/* ── POST /api/upload ── */
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, error: 'No file received by the server.' });
    }
    
    // req.file.path is now a permanent global HTTPS URL provided by Cloudinary
    res.json({
      success: true,
      message: 'Image securely saved to Cloud Storage!',
      url: req.file.path 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ── API ENDPOINTS FOR CROSS-DEVICE SYNCHRONIZATION ───────────── */

// 1. Authentication APIs
app.post('/api/register', (req, res) => {
  const { name, address, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
  }
  const existingUser = DATA_STORE.users.find(u => u.email === email || u.phone === phone);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User already exists with this email or phone.' });
  }
  const newUser = { id: Date.now().toString(), name, address, phone, email, password };
  DATA_STORE.users.push(newUser);
  res.json({ success: true, message: 'Registration successful!', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const user = DATA_STORE.users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid name or password.' });
  }
  res.json({ success: true, message: 'Login successful.', user });
});

app.post('/api/admin-login', (req, res) => {
  const { password } = req.body;
  if (password === DATA_STORE.adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect Admin Password.' });
  }
});

// 2. Core Dashboard System APIs
app.get('/api/menu', (req, res) => {
  res.json({ success: true, menuItems: DATA_STORE.menuItems });
});

app.post('/api/orders', (req, res) => {
  const { user, items, total, eventDate, remarks, payment, callbackRequested } = req.body;
  if (!user || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order cannot be empty.' });
  }
  const newOrder = {
    id: "MNG-" + Math.floor(1000 + Math.random() * 9000),
    user,
    items,
    total,
    eventDate: eventDate || 'Not specified',
    remarks: remarks || '',
    payment: payment || 'Pending',
    callbackRequested: callbackRequested || false,
    status: 'Pending',
    createdAt: new Date().toLocaleString()
  };
  DATA_STORE.orders.push(newOrder);
  res.json({ success: true, message: 'Order placed successfully!', order: newOrder });
});

// 3. Admin Management Dash APIs
app.get('/api/admin/data', (req, res) => {
  res.json({
    success: true,
    orders: DATA_STORE.orders,
    users: DATA_STORE.users,
    menuItems: DATA_STORE.menuItems,
    combos: DATA_STORE.combos
  });
});

app.post('/api/admin/change-password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password missing.' });
  DATA_STORE.adminPassword = password;
  res.json({ success: true, message: 'Password updated successfully!' });
});

/* ── Ensure uploads directory structure exists safely ─────────── */
//const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.listen(PORT, () => console.log(`EXPRESS Server running globally on port ${PORT}`));
