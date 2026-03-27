const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow requests from other origins (like our frontend)
app.use(express.json()); // Allow parsing JSON data in request bodies
app.use(express.static(__dirname)); // Serve static files from the project folder

// Simple In-Memory Database (Array)
let borrowItems = [
    {
        id: 1,
        name: "Casio fx-991EX",
        description: "Perfect condition scientific calculator. Vital for engineering mid-sem exams.",
        price: 50,
        timeUnit: "day",
        image: "../assets/images/casio.jpg",
        category: "Electronics",
        status: "Available",
        owner: "Rahul M."
    },
    {
        id: 2,
        name: "A1 Drawing Board + Drafter",
        description: "Complete set for first-year Engineering Graphics. Excellent condition.",
        price: 200,
        timeUnit: "week",
        image: "../assets/images/drawingboard.jpg",
        category: "Equipment",
        status: "Available",
        owner: "Priya S."
    },
    {
        id: 3,
        name: "Let Us C - Yashavant K.",
        description: "Standard textbook for intro to programming. 18th Edition.",
        price: 30,
        timeUnit: "week",
        image: "../assets/images/book.jpg",
        category: "Books",
        status: "In Use",
        owner: "System"
    },
    {
        id: 4,
        name: "Chemistry Lab Coat (Size M)",
        description: "White cotton lab coat, washed and ironed. Mandatory for chem lab.",
        price: 20,
        timeUnit: "day",
        image: "../assets/images/apron.png",
        category: "Apparel",
        status: "Available",
        owner: "Ananya T."
    }
];

// --- API ENDPOINTS ---

// 1. Fetch all items (GET)
app.get('/api/items', (req, res) => {
    // Return our array of items as JSON
    res.json(borrowItems);
});

// 2. Add a new item (POST)
app.post('/api/items', (req, res) => {
    // Construct the new item from the incoming data
    const newItem = {
        id: borrowItems.length + 1, // Generate a simple ID
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        timeUnit: req.body.timeUnit,
        image: "../assets/images/logo.png", // Fallback placeholder image for user uploads
        category: "General", // Default string
        status: "Available",
        owner: "You (Current User)" // Simulated current user
    };
    
    // Add to our "database"
    borrowItems.push(newItem);
    
    // Send back a success response
    res.status(201).json({ message: "Item successfully added!", item: newItem });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend Server running on: http://localhost:${PORT}`);
    console.log(`You can access the API at http://localhost:${PORT}/api/items`);
});
