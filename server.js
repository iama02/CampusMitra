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
const Notification = require('./models/notification');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'campusmitra',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from other origins (like our frontend)
app.use(express.json({ limit: '2mb' })); // We no longer need 50mb because we aren't sending Base64 strings!
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
app.post('/api/items', upload.single('image'), async (req, res) => {
    try {
        // Find the maximum existing id to simulate auto-increment for our simple system
        const highestItem = await BorrowItem.findOne().sort('-id').exec();
        const nextId = highestItem && highestItem.id ? highestItem.id + 1 : 1;

        const imageUrl = req.file ? req.file.path : (req.body.image || "../assets/images/logo.png");

        const newItem = new BorrowItem({
            id: nextId,
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            timeUnit: req.body.timeUnit,
            image: imageUrl, // Uses Cloudinary URL if uploaded
            category: req.body.category || "Other", // Accept category from frontend
            status: "Available",
            owner: req.body.owner || "You (Current User)" // Accept owner from frontend or fallback
        });

        await newItem.save();
        res.status(201).json({ message: "Item successfully added!", item: newItem });
    } catch (err) {
        res.status(400).json({ message: "Error saving item", error: err.message });
    }
});

// 3. Delete an item (DELETE - Protected)
app.delete('/api/items/:id', requireAuth, async (req, res) => {
    try {
        const item = await BorrowItem.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Verify ownership
        if (item.owner !== req.user.name) {
            return res.status(403).json({ message: "Unauthorized: You do not own this item" });
        }

        // Safeguard: Do not allow deletion if the item is currently lent out
        if (item.status === 'In Use' || item.status === 'Reserved') {
            return res.status(400).json({ message: "Cannot delete item while it is 'In Use' or 'Reserved'. Please wait for its return." });
        }

        // Optional: Remove any orphaned borrow requests to keep databases clean
        await BorrowRequest.deleteMany({ itemId: item.id });

        await BorrowItem.findOneAndDelete({ id: req.params.id });
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

        const user = await User.findOne({ email: email.toLowerCase() });
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

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No account found with that email' });

        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token for database storage
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/pages/auth.html?reset_token=${resetToken}`;

        // Send email using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'CampusMitra - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; pColor: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #2563eb; text-align: center;">CampusMitra Password Reset</h2>
                    <p style="font-size: 16px;">Hello,</p>
                    <p style="font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #555;">This link will expire in 15 minutes.</p>
                    <p style="font-size: 14px; color: #555;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset link sent to: ${user.email}`);

        res.json({ message: 'Password reset link has been sent to your email.' });
    } catch (err) {
        res.status(500).json({ message: 'Error generating reset capability', error: err.message });
    }
});

// Reset Password
app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;

        // Hash the incoming plaintext token to match what's stored in DB
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

        // Update password (pre-save hook will hash it)
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Error resetting password', error: err.message });
    }
});

// Update User Profile (e.g., WhatsApp Number)
app.patch('/api/users/me', requireAuth, async (req, res) => {
    try {
        const { whatsappNumber } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (whatsappNumber !== undefined) {
            user.whatsappNumber = whatsappNumber;
        }
        await user.save();

        // Generate a fresh JWT Token with updated payload
        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, whatsappNumber: user.whatsappNumber },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Profile updated successfully!',
            token,
            user: { id: user._id, name: user.name, email: user.email, whatsappNumber: user.whatsappNumber }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error updating profile', error: err.message });
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

        // Notify Tutor
        await new Notification({
            userId: tutor.ownerId,
            title: 'New Session Request',
            message: `${req.user.name} has requested a tutoring session with you.`,
            type: 'info',
            link: '/pages/tuition.html'
        }).save();

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

        // Notify Student
        await new Notification({
            userId: request.studentId,
            title: `Session ${status}`,
            message: `${tutorProfile.name} has ${status.toLowerCase()} your session request.`,
            type: status === 'Accepted' ? 'success' : 'warning',
            link: '/pages/tuition.html'
        }).save();

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

        const itemOwner = await User.findOne({ name: item.owner });
        if (itemOwner) {
            await new Notification({
                userId: itemOwner._id,
                title: 'New Borrow Request',
                message: `${req.user.name} has requested to borrow your item: ${item.name}.`,
                type: 'info',
                link: '/pages/borrow.html'
            }).save();
        }

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
            const item = await BorrowItem.findOne({ id: request.itemId });
            if (item && item.status !== 'Available') {
                return res.status(400).json({ message: 'Item is no longer available. You cannot accept this request.' });
            }
            request.handoverOTP = Math.floor(1000 + Math.random() * 9000).toString();
            request.returnOTP = Math.floor(1000 + Math.random() * 9000).toString();
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'Reserved' });
        } else if (status === 'Declined') {
            await BorrowItem.findOneAndUpdate({ id: request.itemId }, { status: 'Available' });
        }

        await request.save();

        const requester = await User.findById(request.requesterId);
        if (requester) {
            await new Notification({
                userId: requester._id,
                title: `Borrow Request ${status}`,
                message: `Your request to borrow ${request.itemName} was ${status.toLowerCase()}.`,
                type: status === 'Accepted' ? 'success' : 'warning',
                link: '/pages/borrow.html'
            }).save();
        }

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
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
                if (aiErr.status === 503 || (aiErr.message && aiErr.message.includes('503'))) {
                    console.warn("⚠️ AI Match skipped: Gemini API is experiencing high demand (503 Service Unavailable).");
                } else {
                    console.error("⚠️ AI Match Error (Non-Fatal):", aiErr.message || aiErr);
                }
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

// --- NOTIFICATIONS ENDPOINTS ---

app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications', error: err.message });
    }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        if (notification.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Marked as read', notification });
    } catch (err) {
        res.status(500).json({ message: 'Error updating notification status' });
    }
});

app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

app.delete('/api/notifications', requireAuth, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.id });
        res.json({ message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ message: 'Error clearing notifications' });
    }
});

// Start the server (but do not bind port if we are running automated tests)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend Server running on: http://localhost:${PORT}`);
        console.log(`You can access the API at http://localhost:${PORT}/api/items`);
    });
}

// Export module for Supertest integration testing
module.exports = app;
