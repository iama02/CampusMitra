const mongoose = require('mongoose');

const tutoringRequestSchema = new mongoose.Schema({
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TutorProfile',
        required: true
    },
    tutorName: {
        type: String,
        required: true,
        trim: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    studentEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined'],
        default: 'Pending'
    }
}, { timestamps: true });

tutoringRequestSchema.index({ tutorId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('TutoringRequest', tutoringRequestSchema);
