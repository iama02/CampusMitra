require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const BorrowItem = require('./models/borrowItem');
const TutorProfile = require('./models/tutorProfile');
const TutoringRequest = require('./models/tutoringRequest');
const User = require('./models/user');
const BorrowRequest = require('./models/borrowRequest');
const jwt = require('jsonwebtoken');
const LostFoundItem = require('./models/lostFoundItem');
const Review = require('./models/review');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        const { name, rollNo, email, branch, year, password, whatsappNumber } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { rollNo }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or roll number already exists' });
        }

        const newUser = new User({ name, rollNo, email, branch, year, password, whatsappNumber });
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
            { id: user._id, name: user.name, email: user.email, whatsappNumber: user.whatsappNumber },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: { id: user._id, name: user.name, email: user.email, whatsappNumber: user.whatsappNumber }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during login', error: err.message });
    }
});

// Rate a user
app.post('/api/users/rate', requireAuth, async (req, res) => {
    try {
        const { targetName, rating, requestId } = req.body;
        if (!targetName || !rating || !requestId) return res.status(400).json({ message: 'Missing fields' });
        if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Invalid rating' });

        if (targetName === req.user.name) return res.status(400).json({ message: 'You cannot rate yourself' });

        const targetUser = await User.findOne({ name: targetName });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const newReview = new Review({
            reviewerId: req.user.id,
            targetName: targetName,
            rating: rating,
            requestId: requestId
        });

        await newReview.save();

        const totalScore = (targetUser.averageRating * targetUser.ratingCount) + rating;
        targetUser.ratingCount += 1;
        targetUser.averageRating = Math.round((totalScore / targetUser.ratingCount) * 10) / 10;
        await targetUser.save();

        res.json({ message: 'Rating submitted successfully!' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'You have already rated this user for this transaction' });
        }
        res.status(500).json({ message: 'Error submitting rating', error: err.message });
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

// Delete a tutor profile
app.delete('/api/tutors/:id', requireAuth, async (req, res) => {
    try {
        const tutorProfile = await TutorProfile.findById(req.params.id);
        if (!tutorProfile) {
            return res.status(404).json({ message: 'Tutor profile not found' });
        }

        if (String(tutorProfile.ownerId) !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to delete this profile' });
        }

        // Optional: Also delete associated tutoring requests, though not strictly required
        await TutoringRequest.deleteMany({ tutorId: tutorProfile._id });

        await tutorProfile.deleteOne();
        res.json({ message: 'Tutor profile deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting tutor profile', error: err.message });
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
        
        const incomingRequests = await TutoringRequest.find({ tutorId: { $in: tutorIds } }).sort({ createdAt: -1 }).lean();
        for (let reqObj of incomingRequests) {
            const user = await User.findById(reqObj.studentId);
            if (user) {
                if (user.whatsappNumber) reqObj.requesterWhatsapp = user.whatsappNumber;
                reqObj.requesterRollNo = user.rollNo;
                reqObj.requesterRating = user.averageRating;
                reqObj.requesterRatingCount = user.ratingCount;
            }
        }
        res.json(incomingRequests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching incoming requests', error: err.message });
    }
});

// Fetch outgoing tutoring requests made by the logged-in user
app.get('/api/tutors/requests/outgoing', requireAuth, async (req, res) => {
    try {
        const outgoingRequests = await TutoringRequest.find({ studentId: req.user.id }).sort({ createdAt: -1 }).lean();
        for (let reqObj of outgoingRequests) {
            const tutor = await TutorProfile.findById(reqObj.tutorId);
            if (tutor && tutor.ownerId) {
                const user = await User.findById(tutor.ownerId); // Note ownerId might be string, findById supports strings usually if they are objectIds, wait ownerId in TutorProfile is a string of ObjectId
                if (user) {
                    if (user.whatsappNumber) reqObj.tutorWhatsapp = user.whatsappNumber;
                    reqObj.tutorRollNo = user.rollNo;
                    reqObj.tutorRating = user.averageRating;
                    reqObj.tutorRatingCount = user.ratingCount;
                }
            }
        }
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

// --- BORROW REQUESTS ENDPOINTS ---

// Create a borrow request
app.post('/api/items/:id/request', requireAuth, async (req, res) => {
    try {
        const item = await BorrowItem.findOne({ id: Number(req.params.id) });
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.owner === req.user.name) {
            return res.status(400).json({ message: 'You cannot borrow your own item' });
        }

        const request = new BorrowRequest({
            itemId: item.id,
            itemName: item.name,
            ownerName: item.owner,
            requesterId: req.user.id,
            requesterName: req.user.name,
            requesterEmail: req.user.email
        });

        await request.save();
        res.status(201).json({ message: 'Borrow request sent successfully' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'You have already requested this item' });
        res.status(500).json({ message: 'Error sending borrow request', error: err.message });
    }
});

// Fetch incoming borrow requests
app.get('/api/items/requests/incoming', requireAuth, async (req, res) => {
    try {
        const incomingRequests = await BorrowRequest.find({ ownerName: req.user.name }).sort({ createdAt: -1 }).lean();
        for (let reqObj of incomingRequests) {
            const user = await User.findById(reqObj.requesterId);
            if (user) {
                if (user.whatsappNumber) reqObj.requesterWhatsapp = user.whatsappNumber;
                reqObj.requesterRollNo = user.rollNo;
                reqObj.requesterRating = user.averageRating;
                reqObj.requesterRatingCount = user.ratingCount;
            }
        }
        res.json(incomingRequests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching incoming borrow requests' });
    }
});

// Fetch outgoing borrow requests
app.get('/api/items/requests/outgoing', requireAuth, async (req, res) => {
    try {
        const outgoingRequests = await BorrowRequest.find({ requesterId: req.user.id }).sort({ createdAt: -1 }).lean();
        for (let reqObj of outgoingRequests) {
            const ownerUser = await User.findOne({ name: reqObj.ownerName });
            if (ownerUser) {
                if (ownerUser.whatsappNumber) reqObj.ownerWhatsapp = ownerUser.whatsappNumber;
                reqObj.ownerRollNo = ownerUser.rollNo;
                reqObj.ownerRating = ownerUser.averageRating;
                reqObj.ownerRatingCount = ownerUser.ratingCount;
            }
        }
        res.json(outgoingRequests);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching outgoing borrow requests' });
    }
});

// Update borrow request status
app.patch('/api/items/requests/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Accepted', 'Declined'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const request = await BorrowRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        if (request.ownerName !== req.user.name) return res.status(403).json({ message: 'Unauthorized' });

        request.status = status;
        
        if (status === 'Accepted') {
            request.handoverOTP = Math.floor(1000 + Math.random() * 9000).toString();
            request.returnOTP = Math.floor(1000 + Math.random() * 9000).toString();
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'Reserved' });
        } else if (status === 'Declined') {
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'Available' });
        }

        await request.save();

        res.json({ message: `Request successfully ${status.toLowerCase()}`, request });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status' });
    }
});

// Verify Handover/Return OTP
app.post('/api/items/requests/:id/verify-otp', requireAuth, async (req, res) => {
    try {
        const { phase, otp } = req.body;
        const request = await BorrowRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (phase === 'handover') {
            if (request.ownerName !== req.user.name) return res.status(403).json({ message: 'Unauthorized' });
            if (request.handoverOTP !== otp) return res.status(400).json({ message: 'Invalid Pickup PIN. Please try again.' });
            
            request.status = 'In Use';
            request.handoverOTP = null; 
            await request.save();
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'In Use' });
            
            return res.json({ message: 'Handover verified successfully!', request });
            
        } else if (phase === 'return') {
            if (request.requesterId.toString() !== req.user.id.toString()) return res.status(403).json({ message: 'Unauthorized' });
            if (request.returnOTP !== otp) return res.status(400).json({ message: 'Invalid Return PIN. Please try again.' });

            request.status = 'Returned';
            request.returnOTP = null;
            await request.save();
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'Available' });
            
            return res.json({ message: 'Return verified successfully! Item is available again.', request });
        } else {
            return res.status(400).json({ message: 'Invalid phase specified' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error verifying OTP' });
    }
});

// --- LOST & FOUND ENDPOINTS ---

app.get('/api/lostfound', async (req, res) => {
    try {
        const items = await LostFoundItem.find({ status: 'Open' }).sort({ createdAt: -1 }).lean();
        // Since original UI needs specific keys, map to frontend expected format or adjust frontend
        // We will adjust frontend to consume the MongoDB keys correctly.
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching lost and found items' });
    }
});

app.post('/api/lostfound', requireAuth, async (req, res) => {
    try {
        const { type, name, description, location } = req.body;
        
        const newItem = new LostFoundItem({
            type,
            name,
            description,
            location,
            reporterId: req.user.id,
            reporterName: req.user.name,
            reporterEmail: req.user.email,
            reporterWhatsapp: req.user.whatsappNumber
        });
        
        await newItem.save();

        // Perform AI match check against opposite type
        const matches = [];
        const oppositeType = type === 'Lost' ? 'Found' : 'Lost';
        const searchItems = await LostFoundItem.find({ type: oppositeType, status: 'Open' }).lean();

        if (searchItems.length > 0 && process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const prompt = `
I have a newly reported ${type} item with these details:
Name: ${name}
Description: ${description}
Location: ${location}

Compare it against this list of ${oppositeType} items:
${JSON.stringify(searchItems.map(i => ({ id: i._id, name: i.name, description: i.description, location: i.location })), null, 2)}

Identify any potential matches. Return standard JSON array of objects with keys "id" (the matching item's id exactly as provided string) and "score" (a confidence percentage 0-100). Only include matches >50%. If no matches look possible, return an empty array [].
Return EXACTLY valid JSON array. Do not include markdown \`\`\`json.
`;

            try {
                const result = await model.generateContent(prompt);
                let responseText = result.response.text().trim();
                if (responseText.startsWith('\`\`\`json')) {
                    responseText = responseText.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/, '').trim();
                } else if (responseText.startsWith('\`\`\`')) {
                    responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
                }
                const aiMatches = JSON.parse(responseText);
                
                if (Array.isArray(aiMatches)) {
                    for (let match of aiMatches) {
                        const item = searchItems.find(i => i._id.toString() === match.id.toString());
                        if (item) {
                            matches.push({ item, score: match.score });
                        }
                    }
                }
            } catch (aiErr) {
                console.error("AI Match Error:", aiErr);
            }
        }
        
        matches.sort((a, b) => b.score - a.score);

        res.status(201).json({ item: newItem, matches });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to report item' });
    }
});

app.delete('/api/lostfound/:id', requireAuth, async (req, res) => {
    try {
        const item = await LostFoundItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.reporterEmail !== req.user.email) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own posts.' });
        }

        await item.deleteOne();
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend Server running on: http://localhost:${PORT}`);
    console.log(`You can access the API at http://localhost:${PORT}/api/items`);
});
