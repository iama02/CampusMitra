const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
    itemId: {
        type: Number, // Since BorrowItem uses explicit Number id
        required: true
    },
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requesterName: {
        type: String,
        required: true,
        trim: true
    },
    requesterEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined', 'In Use', 'Returned'],
        default: 'Pending'
    },
    handoverOTP: {
        type: String,
        default: null
    },
    returnOTP: {
        type: String,
        default: null
    }
}, { timestamps: true });

// A user can only have one active request per item
borrowRequestSchema.index({ itemId: 1, requesterId: 1 }, { unique: true });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
