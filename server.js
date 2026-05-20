/**
 * Mangalam Catering Services – Node.js/Express Server
 * ----------------------------------------------------
 * Serves the frontend (public/) and handles operational requests.
 */
/**
 * Mangalam Catering Services – Node.js/Express Server
 * ----------------------------------------------------
 * Serves the frontend and handles cross-device operational sync.
 * Persists orders, users, and menu data to a JSON store file.
 * Automatically saves image assets to Cloudinary Cloud Storage.
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const cors     = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE INTEGRATION ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // Fallback path for index.html at root

// ── PERSISTENT FILE SYSTEM ALLOCATION ──
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const DB_FILE = path.join(UPLOADS_DIR, 'db_store.json');

console.log("In Load Global data################");
// Helper to safely load data from disk file
function loadGlobalData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading db file, falling back to defaults", e);
  }
  return {
    users: [],
    orders: [],
    menuItems: [
      { id: "1", name: "Idli Sambar", type: "Breakfast", price: 80, desc: "Soft fluffy steamed rice cakes served with authentic sambar.", image: "" },
      { id: "2", name: "Masala Dosa", type: "Breakfast", price: 100, desc: "Crispy crepe filled with lightly spiced potato mash.", image: "" },
      { id: "3", name: "South Indian Meals", type: "Lunch", price: 150, desc: "Rice, Sambar, Rasam, Kootu, Poriyal, Curd, and Appalam.", image: "" },
      { id: "4", name: "Veg Biryani", type: "Dinner", price: 140, desc: "Fragrant basmati rice cooked with assorted vegetables and spices.", image: "" }
    ],
    combos: [],
    adminPassword: "admin"
  };
}

// Helper to safely save data to disk file
function saveGlobalData(data) {
  try {//console.log("In SaveGlobalData......$$$$$$$$$$$$$$$$");
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write persistence file to disk:", e);
  }
}

// Initialize internal application data layer
let DATA_STORE = loadGlobalData();

/* ── SECURE CLOUDINARY MEDIA CONFIGURATION ── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mangalam_menu', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 400, crop: 'limit' }]
  }
});

const upload = multer({ 
  storage: cloudStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB File constraint cap
});

/* ── MAIN ROOT APPLICATION ROUTE ── */
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'index.html'));
});

/* ── ERROR-HANDLING SECURE FILE UPLOAD API ── */
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer Runtime Error:", err);
      return res.status(400).json({ success: false, error: `Multer configuration fault: ${err.message}` });
    } else if (err) {
      console.error("Cloudinary Configuration/Connection Error:", err);
      return res.status(500).json({ success: false, error: `Cloud configuration setup fault: ${err.message}` });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, error: 'No file context streamed to target route.' });
    }

    console.log("Asset successfully pushed to Cloudinary:", req.file.path);
    res.json({
      success: true,
      message: 'Image securely saved to Cloud Storage!',
      url: req.file.path
    });
  });
});

/* ── CORE CROSS-DEVICE OPERATIONAL ENDPOINTS ── */

// User Registration API
app.post('/api/register', (req, res) => {
  DATA_STORE = loadGlobalData();
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
  saveGlobalData(DATA_STORE);
  res.json({ success: true, message: 'Registration successful!', user: newUser });
});

// User Login API
app.post('/api/login', (req, res) => {
  DATA_STORE = loadGlobalData();
  const { name, password } = req.body;
  const user = DATA_STORE.users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid name or password.' });
  }
  res.json({ success: true, message: 'Login successful.', user });
});

// Admin Authentication Gateway API
app.post('/api/admin-login', (req, res) => {
  DATA_STORE = loadGlobalData();
  const { password } = req.body;
  if (password === DATA_STORE.adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect Admin Password.' });
  }
});

// Client Dashboard Menu Access API
app.get('/api/menu', (req, res) => {
  DATA_STORE = loadGlobalData();
  res.json({ success: true, menuItems: DATA_STORE.menuItems });
});

// Order Submission API
app.post('/api/orders', (req, res) => {
  DATA_STORE = loadGlobalData();
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
  };//console.log("In orders..++++++++++++");
  DATA_STORE.orders.push(newOrder);
  saveGlobalData(DATA_STORE);
  res.json({ success: true, message: 'Order placed successfully!', order: newOrder });
});

/* ── ADMIN MANAGEMENT APIs ── */

// Central Sync Pipeline (Forces cross-device operational tracking views)
app.get('/api/admin/data', (req, res) => {
  DATA_STORE = loadGlobalData();
  res.json({
    success: true,
    orders: DATA_STORE.orders,
    users: DATA_STORE.users,
    menuItems: DATA_STORE.menuItems,
    combos: DATA_STORE.combos || []
  });console.log("Creoss-Device Trackg Views....");
});

// Create/Update Menu Items from Admin Panel
app.post('/api/admin/add-item', (req, res) => {
  DATA_STORE = loadGlobalData();
  const { name, type, price, desc, image } = req.body;
  
  const newItem = {
    id: Date.now().toString(),
    name,
    type,
    price: parseFloat(price),
    desc,
    image: image || "" // Takes the structural absolute Cloudinary cloud url string
  };
  
  DATA_STORE.menuItems.push(newItem);
  saveGlobalData(DATA_STORE);
  res.json({ success: true, menuItems: DATA_STORE.menuItems });
});

// Change Master Password API
app.post('/api/admin/change-password', (req, res) => {
  DATA_STORE = loadGlobalData();
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password missing.' });
  DATA_STORE.adminPassword = password;
  saveGlobalData(DATA_STORE);
  res.json({ success: true, message: 'Password updated successfully!' });
});

/* ── GLOBAL SERVER LIFECYCLE CONTROLLER ── */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EXPRESS Sync Server listening dynamically on port ${PORT}`);
});
