const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// Import models
const User = require('./models/User');
const Conversation = require('./models/Conversation');

// Import chatbot logic
const {
    analyzeRisk,
    detectPhysicalSymptoms,
    generateResponse,
    resources
} = require('./services/ChatbotService');
const KBClient = require('./services/KBClient');

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mental_health_chatbot';

// Middleware
app.use(cors());
app.use(express.json());

// Establish connection to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Initialize Knowledge Base Client
const kb = new KBClient();

// Serve static frontend (if built, acting as fallback like main.py did)
const staticDir = path.join(__dirname, '../../static');
app.use('/static', express.static(staticDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: "healthy",
        database_connected: mongoose.connection.readyState === 1,
        ollama_available: false,
        model_loaded: true,
        model: "rule-based + fuzzy local KB"
    });
});

// User profile endpoints
app.post('/user', async (req, res) => {
    try {
        const { userId, name, age, gender, mood, preferredTone, location } = req.body;
        if (!userId) {
            return res.status(400).json({ detail: "userId is required" });
        }

        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ userId });
        }

        if (name !== undefined) user.name = name;
        if (age !== undefined) user.age = age;
        if (gender !== undefined) user.gender = gender;
        if (mood !== undefined) user.mood = mood;
        if (preferredTone !== undefined) user.preferredTone = preferredTone;
        if (location !== undefined) user.location = location;

        await user.save();
        res.json(user);
    } catch (e) {
        console.error("Error saving user profile:", e);
        res.status(500).json({ detail: `Error saving user profile: ${e.message}` });
    }
});

app.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ detail: "User profile not found" });
        }
        res.json(user);
    } catch (e) {
        console.error("Error fetching user profile:", e);
        res.status(500).json({ detail: `Error fetching user profile: ${e.message}` });
    }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { message = "", user_id = "anonymous", session_id = "default", location } = req.body;
        const userInput = message.trim();

        if (!userInput) {
            return res.status(400).json({ detail: "Message cannot be empty" });
        }

        // 1. Fetch user details from database to enrich location context
        const user = await User.findOne({ userId: user_id });
        const userLocation = location || (user ? user.location : '') || '';

        // 2. Fetch session conversation history
        let convo = await Conversation.findOne({ userId: user_id, sessionId: session_id });
        if (!convo) {
            convo = new Conversation({ userId: user_id, sessionId: session_id, messages: [] });
        }

        // Context history in simple format for generator service
        const history = convo.messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

        // 3. Analysis
        const riskAnalysis = analyzeRisk(userInput);
        const phys = detectPhysicalSymptoms(userInput);

        let responseData = {};

        // 4. Generation
        if (['crisis', 'high'].includes(riskAnalysis.risk_level)) {
            responseData = await generateResponse(userInput, riskAnalysis, history);
        } else {
            const entry = kb.query(userInput);
            responseData = {
                response: entry.response || "I'm here to listen. Tell me more.",
                suggested_resources: resources[riskAnalysis.risk_level] || [],
                risk_level: entry.risk_level || riskAnalysis.risk_level,
                needs_immediate_help: riskAnalysis.needs_immediate_help || false
            };
        }

        // 5. Additional guidance for symptoms
        if (phys.severity === 'minor') {
            responseData.response += `\n\nNote: I noticed you mentioned some physical symptoms (${phys.symptoms.join(', ')}). For minor symptoms like a mild fever or cough, rest, fluids, and over-the-counter remedies may help. If symptoms worsen, consider seeing a doctor.`;
        } else if (phys.severity === 'serious') {
            const query = userLocation ? `doctors near ${userLocation}` : "doctors near me";
            const mapsUrl = `https://www.google.com/maps/search/${query.replace(/ /g, '+')}`;
            responseData.response += `\n\nI see potentially serious physical symptoms (${phys.symptoms.join(', ')}). I recommend seeking medical attention right away. You can find nearby doctors or urgent care here: ${mapsUrl}`;
            responseData.needs_immediate_help = true;
        }

        // 6. Save messages to database
        convo.messages.push({
            role: "user",
            content: userInput,
            timestamp: new Date()
        });

        convo.messages.push({
            role: "assistant",
            content: responseData.response,
            timestamp: new Date(),
            riskLevel: responseData.risk_level,
            suggestedResources: responseData.suggested_resources,
            needsImmediateHelp: responseData.needs_immediate_help
        });

        await convo.save();

        console.log(`Chat response for user ${user_id}: Risk level ${responseData.risk_level}`);
        res.json(responseData);

    } catch (e) {
        console.error("Error in chat endpoint:", e);
        res.status(500).json({ detail: `Error processing message: ${e.message}` });
    }
});

// Admin endpoint to reload KB
app.post('/admin/reload_kb', (req, res) => {
    try {
        kb.reload();
        res.json({ reloaded: true, entries: kb.entries.length });
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

// History endpoint
app.get('/conversation/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const conversations = await Conversation.find({ userId });
        const userConversations = {};

        for (const convo of conversations) {
            const key = `${convo.userId}_${convo.sessionId}`;
            userConversations[key] = convo.messages.map(m => ({
                role: m.role,
                content: m.content,
                risk_level: m.riskLevel,
                suggested_resources: m.suggestedResources,
                needs_immediate_help: m.needsImmediateHelp,
                timestamp: m.timestamp
            }));
        }

        res.json({ user_id: userId, conversations: userConversations });
    } catch (e) {
        console.error("Error fetching conversation history:", e);
        res.status(500).json({ detail: e.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Mental Health Chatbot backend running on http://localhost:${PORT}`);
});
