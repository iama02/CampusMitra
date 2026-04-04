const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subjects: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    availability: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: String,
        default: '*****'
    },
    reviewText: {
        type: String,
        default: '"New Tutor on CampusMitra!"'
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    ownerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    }
}, { timestamps: true });

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
