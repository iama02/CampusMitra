const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, { timestamps: true });

// Prevent double rating the same request
reviewSchema.index({ reviewerId: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
