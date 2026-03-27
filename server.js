require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const BorrowItem = require('./models/borrowItem');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow requests from other origins (like our frontend)
app.use(express.json({ limit: '50mb' })); // Allow parsing large JSON data specifically for base64 images
app.use(express.static(__dirname)); // Serve static files from the project folder

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusmitra')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

// --- API ENDPOINTS ---

// 1. Fetch all items (GET)
app.get('/api/items', async (req, res) => {
    try {
        const items = await BorrowItem.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: "Error fetching items", error: err.message });
    }
});

// 2. Add a new item (POST)
app.post('/api/items', async (req, res) => {
    try {
        // Find the maximum existing id to simulate auto-increment for our simple system
        const highestItem = await BorrowItem.findOne().sort('-id').exec();
        const nextId = highestItem && highestItem.id ? highestItem.id + 1 : 1;

        const newItem = new BorrowItem({
            id: nextId,
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            timeUnit: req.body.timeUnit,
            image: req.body.image || "../assets/images/logo.png", // Accept image from frontend or fallback
            category: "General", // Default string
            status: "Available",
            owner: req.body.owner || "You (Current User)" // Accept owner from frontend or fallback
        });
        
        await newItem.save();
        res.status(201).json({ message: "Item successfully added!", item: newItem });
    } catch (err) {
        res.status(400).json({ message: "Error saving item", error: err.message });
    }
});

// 3. Delete an item (DELETE)
app.delete('/api/items/:id', async (req, res) => {
    try {
        const deletedItem = await BorrowItem.findOneAndDelete({ id: req.params.id });
        if (!deletedItem) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json({ message: "Item deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting item", error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend Server running on: http://localhost:${PORT}`);
    console.log(`You can access the API at http://localhost:${PORT}/api/items`);
});
