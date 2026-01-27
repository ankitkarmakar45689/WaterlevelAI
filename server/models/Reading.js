const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
    },
    percentage: {
        type: Number,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Reading', ReadingSchema);
