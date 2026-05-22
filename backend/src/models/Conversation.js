const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['user', 'assistant']
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    riskLevel: {
        type: String,
        default: 'low'
    },
    suggestedResources: {
        type: [String],
        default: []
    },
    needsImmediateHelp: {
        type: Boolean,
        default: false
    }
});

const ConversationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        default: 'default_session',
        index: true
    },
    messages: [MessageSchema],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on save
ConversationSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Conversation', ConversationSchema);
