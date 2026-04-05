const mongoose = require('mongoose');

const lostFoundItemSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Lost', 'Found']
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: () => new Date().toLocaleDateString()
    },
    status: {
        type: String,
        enum: ['Open', 'Resolved'],
        default: 'Open'
    },
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reporterName: {
        type: String,
        required: true
    },
    reporterEmail: {
        type: String,
        required: true
    },
    reporterWhatsapp: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('LostFoundItem', lostFoundItemSchema);
