require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const BorrowItem = require('./models/borrowItem');
const TutorProfile = require('./models/tutorProfile');
const TutoringRequest = require('./models/tutoringRequest');
const User = require('./models/user');
const jwt = require('jsonwebtoken');

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

function getJwtSecret() {
    return process.env.JWT_SECRET || 'campusmitra_super_secret_key_2026';
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7);

    try {
        req.user = jwt.verify(token, getJwtSecret());
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

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

// --- AUTHENTICATION ENDPOINTS ---

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, rollNo, email, branch, year, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { rollNo }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or roll number already exists' });
        }

        const newUser = new User({ name, rollNo, email, branch, year, password });
        await newUser.save();
        
        res.status(201).json({ message: 'Registration successful! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Error during registration', error: err.message });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during login', error: err.message });
    }
});

// --- PEER TUTORING ENDPOINTS ---

// Fetch all tutor profiles
app.get('/api/tutors', async (req, res) => {
    try {
        const tutors = await TutorProfile.find().sort({ createdAt: -1 });
        res.json(tutors);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tutor profiles', error: err.message });
    }
});

// Create a tutor profile
app.post('/api/tutors', requireAuth, async (req, res) => {
    try {
        const { name, subjects, description, availability } = req.body;

        if (!name || !subjects || !description || !availability) {
            return res.status(400).json({ message: 'All tutor profile fields are required' });
        }

        const existingProfile = await TutorProfile.findOne({ ownerId: req.user.id });
        if (existingProfile) {
            return res.status(400).json({ message: 'You already have a tutor profile' });
        }

        const tutorProfile = new TutorProfile({
            name,
            subjects,
            description,
            availability,
            ownerId: req.user.id,
            ownerName: req.user.name,
            ownerEmail: req.user.email
        });

        await tutorProfile.save();
        res.status(201).json({ message: 'Tutor profile created successfully', tutor: tutorProfile });
    } catch (err) {
        res.status(500).json({ message: 'Error creating tutor profile', error: err.message });
    }
});

// Create a tutoring session request
app.post('/api/tutors/:id/request', requireAuth, async (req, res) => {
    try {
        const tutor = await TutorProfile.findById(req.params.id);
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor profile not found' });
        }

        if (String(tutor.ownerId) === req.user.id) {
            return res.status(400).json({ message: 'You cannot request a session from your own profile' });
        }

        const request = new TutoringRequest({
            tutorId: tutor._id,
            tutorName: tutor.name,
            studentId: req.user.id,
            studentName: req.user.name,
            studentEmail: req.user.email
        });

        await request.save();
        res.status(201).json({ message: `Session request sent successfully to ${tutor.name}.` });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'You have already requested a session from this tutor' });
        }

        res.status(500).json({ message: 'Error sending tutoring request', error: err.message });
    }
});

// Fetch tutoring summary for the logged-in user
app.get('/api/tutors/me/summary', requireAuth, async (req, res) => {
    try {
        const [profileCount, outgoingRequests, incomingRequests] = await Promise.all([
            TutorProfile.countDocuments({ ownerId: req.user.id }),
            TutoringRequest.countDocuments({ studentId: req.user.id }),
            TutoringRequest.countDocuments({ tutorId: { $in: await TutorProfile.find({ ownerId: req.user.id }).distinct('_id') } })
        ]);

        res.json({
            profileCount,
            outgoingRequests,
            incomingRequests
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tutoring summary', error: err.message });
    }
});

// Fetch incoming tutoring requests for standard user profiles
app.get('/api/tutors/requests/incoming', requireAuth, async (req, res) => {
    try {
        const tutorProfiles = await TutorProfile.find({ ownerId: req.user.id });
        const tutorIds = tutorProfiles.map(p => p._id);
        
        const incomingRequests = await TutoringRequest.find({ tutorId: { $in: tutorIds } }).sort({ createdAt: -1 });
        res.json(incomingRequests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching incoming requests', error: err.message });
    }
});

// Fetch outgoing tutoring requests made by the logged-in user
app.get('/api/tutors/requests/outgoing', requireAuth, async (req, res) => {
    try {
        const outgoingRequests = await TutoringRequest.find({ studentId: req.user.id }).sort({ createdAt: -1 });
        res.json(outgoingRequests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching outgoing requests', error: err.message });
    }
});

// Update the status of a tutoring request (Accept/Decline)
app.patch('/api/tutors/requests/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['Accepted', 'Declined'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be Accepted or Declined.' });
        }

        const request = await TutoringRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Tutoring request not found' });
        }

        const tutorProfile = await TutorProfile.findById(request.tutorId);
        if (!tutorProfile || String(tutorProfile.ownerId) !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to update this request' });
        }

        request.status = status;
        await request.save();

        res.json({ message: `Request successfully ${status.toLowerCase()}`, request });
    } catch (err) {
        res.status(500).json({ message: 'Error updating request status', error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend Server running on: http://localhost:${PORT}`);
    console.log(`You can access the API at http://localhost:${PORT}/api/items`);
});
