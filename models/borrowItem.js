const mongoose = require('mongoose');

const borrowItemSchema = new mongoose.Schema({
    // Using simple types instead of an incrementing ID, we can let MongoDB handle the _id 
    // but the frontend might expect an 'id' field, so let's add an explicit one 
    // or we can use a plugin/pre-save hook, but let's stick to simple mapping for now.
    id: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    timeUnit: { type: String, required: true },
    image: { type: String, default: "../assets/images/logo.png" },
    category: { type: String, default: "General" },
    status: { type: String, default: "Available" },
    owner: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const BorrowItem = mongoose.model('BorrowItem', borrowItemSchema);

module.exports = BorrowItem;
