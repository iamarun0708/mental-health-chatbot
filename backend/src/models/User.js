const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        default: 'Anonymous'
    },
    age: {
        type: Number,
        default: null
    },
    gender: {
        type: String,
        default: ''
    },
    mood: {
        type: String,
        default: 'Okay'
    },
    preferredTone: {
        type: String,
        default: 'Empathetic'
    },
    location: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on save
UserSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('User', UserSchema);
