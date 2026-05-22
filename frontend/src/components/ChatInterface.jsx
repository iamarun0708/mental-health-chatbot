import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Send, 
    HeartPulse, 
    ShieldAlert, 
    Navigation, 
    User as UserIcon, 
    Save, 
    Info, 
    Menu, 
    X,
    Activity
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';

const ChatInterface = () => {
    // Generate or fetch permanent userId from localStorage for persistence
    const getOrInitUserId = () => {
        let storedId = localStorage.getItem('calm_mind_user_id');
        if (!storedId) {
            storedId = 'user_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('calm_mind_user_id', storedId);
        }
        return storedId;
    };
    const [userId] = useState(getOrInitUserId);

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm CalmMind, your AI mental health companion. I'm here to listen and support you. How are you feeling today?",
            risk_level: 'low'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // User Profile fields
    const [profile, setProfile] = useState({
        name: 'Anonymous',
        age: '',
        gender: '',
        mood: 'Okay',
        preferredTone: 'Empathetic',
        location: ''
    });

    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Fetch user details from MongoDB on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/user/${userId}`);
                if (res.data) {
                    setProfile({
                        name: res.data.name || 'Anonymous',
                        age: res.data.age !== null ? res.data.age : '',
                        gender: res.data.gender || '',
                        mood: res.data.mood || 'Okay',
                        preferredTone: res.data.preferredTone || 'Empathetic',
                        location: res.data.location || ''
                    });
                }
            } catch (err) {
                console.log("No profile found on server yet, using default parameters.");
            }
        };
        fetchProfile();
    }, [userId]);

    // Fetch conversation history from MongoDB on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/conversation/${userId}`);
                const sessionKey = `${userId}_default_session`;
                if (res.data && res.data.conversations && res.data.conversations[sessionKey]) {
                    const history = res.data.conversations[sessionKey];
                    if (history.length > 0) {
                        setMessages(history);
                    }
                }
            } catch (err) {
                console.error("Failed to load conversation history from server:", err);
            }
        };
        fetchHistory();
    }, [userId]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BACKEND_URL}/user`, {
                userId,
                ...profile,
                age: profile.age ? parseInt(profile.age) : null
            });
            alert("Profile saved successfully to database!");
        } catch (error) {
            console.error("Error saving profile details:", error);
            alert("Failed to save profile details. Please try again.");
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const response = await axios.post(`${BACKEND_URL}/chat`, {
                message: userMsg,
                user_id: userId,
                session_id: 'default_session',
                location: profile.location
            });

            const data = response.data;
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.response,
                    risk_level: data.risk_level,
                    suggested_resources: data.suggested_resources,
                    needs_immediate_help: data.needs_immediate_help
                }]);
                setIsTyping(false);
            }, 600); // Artificial delay for natural typing feel

        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to the server. Please check that the backend is running and try again.",
                risk_level: 'low',
                isError: true
            }]);
            setIsTyping(false);
        }
    };

    const renderSidebar = () => (
        <div className="glass-panel sidebar-container">
            <header className="sidebar-header">
                <UserIcon color="#0ea5e9" size={24} />
                <h2>Profile & Setup</h2>
                {/* Close button for mobile drawer */}
                <button 
                    className="mobile-sidebar-toggle" 
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setIsSidebarOpen(false)}
                >
                    <X size={20} />
                </button>
            </header>
            <div className="sidebar-content">
                {/* Profile Form Section */}
                <form onSubmit={handleSaveProfile} className="profile-section">
                    <h3 className="section-title">
                        <UserIcon size={16} /> User Details
                    </h3>
                    
                    <div className="form-group">
                        <label>Name</label>
                        <input 
                            type="text" 
                            name="name" 
                            className="form-input"
                            value={profile.name} 
                            onChange={handleProfileChange}
                            placeholder="Enter your name"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Age</label>
                        <input 
                            type="number" 
                            name="age" 
                            className="form-input"
                            value={profile.age} 
                            onChange={handleProfileChange}
                            placeholder="Enter your age"
                            min="1"
                            max="120"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Gender</label>
                        <input 
                            type="text" 
                            name="gender" 
                            className="form-input"
                            value={profile.gender} 
                            onChange={handleProfileChange}
                            placeholder="Gender (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label>Current Mood</label>
                        <select 
                            name="mood" 
                            className="form-select"
                            value={profile.mood} 
                            onChange={handleProfileChange}
                        >
                            <option value="Okay">Okay 😐</option>
                            <option value="Anxious">Anxious 😰</option>
                            <option value="Sad">Sad 😢</option>
                            <option value="Stressed">Stressed 😫</option>
                            <option value="Good">Good 😊</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Preferred Tone</label>
                        <select 
                            name="preferredTone" 
                            className="form-select"
                            value={profile.preferredTone} 
                            onChange={handleProfileChange}
                        >
                            <option value="Empathetic">Empathetic</option>
                            <option value="Gentle">Gentle</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Location (for Doctor Lookup)</label>
                        <input 
                            type="text" 
                            name="location" 
                            className="form-input"
                            value={profile.location} 
                            onChange={handleProfileChange}
                            placeholder="City, State (e.g. Boston, MA)"
                        />
                    </div>

                    <button type="submit" className="save-btn">
                        <Save size={16} /> Save to Database
                    </button>
                </form>

                {/* AI System Info section */}
                <div className="ai-model-section">
                    <h3 className="section-title">
                        <Info size={16} /> AI System Info
                    </h3>
                    <div className="ai-info-card">
                        <h4>Active Architecture</h4>
                        <div className="ai-badge badge-local">Hybrid Rule-Based + KB</div>
                        <p>
                            Uses a rule-based risk classification engine for crisis keywords/symptoms and fuzzy string similarity for standard companion chats.
                        </p>
                    </div>

                    <div className="ai-info-card">
                        <h4>Local Database</h4>
                        <div className="ai-badge badge-local">MongoDB (Mongoose)</div>
                        <p>
                            Connected at port 27017 to securely store user profile metadata and conversation histories.
                        </p>
                    </div>

                    <div className="ai-info-card">
                        <h4>Optional Clients (Built-in)</h4>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="ai-badge badge-local">DeepSeek R1</span>
                            <span className="ai-badge badge-api">GPT-3.5 API</span>
                        </div>
                        <p style={{ marginTop: '4px' }}>
                            Modular python clients exist for local DeepSeek R1 (port 8001) or online OpenAI chat completions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <React.Fragment>
            {/* Sidebar display: Slide in on mobile, normal panel on desktop */}
            <AnimatePresence>
                {(isSidebarOpen || window.innerWidth > 768) && (
                    <motion.div
                        initial={window.innerWidth <= 768 ? { x: '-100%' } : { opacity: 0, scale: 0.95 }}
                        animate={window.innerWidth <= 768 ? { x: 0 } : { opacity: 1, scale: 1 }}
                        exit={window.innerWidth <= 768 ? { x: '-100%' } : { opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={window.innerWidth <= 768 ? "sidebar-container mobile-drawer" : "sidebar-container"}
                    >
                        {renderSidebar()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Interface Container */}
            <div className="glass-panel chat-container">
                {/* Header */}
                <header className="chat-header">
                    {/* Mobile toggle button */}
                    <button 
                        className="mobile-sidebar-toggle"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <Menu size={24} />
                    </button>

                    <HeartPulse color="#0ea5e9" size={32} />
                    <h1>CalmMind</h1>

                    {/* Placeholder on right to align header item */}
                    <div style={{ width: '24px', display: window.innerWidth <= 768 ? 'block' : 'none' }}></div>
                </header>

                {/* Messages Area */}
                <div className="messages-area">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`message-wrapper ${msg.role}`}
                            >
                                <div className={`message-bubble ${msg.role}`}>
                                    <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
                                    
                                    {/* Dynamic Resources Box Based on Risk Level */}
                                    {msg.role === 'assistant' && msg.suggested_resources && msg.suggested_resources.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className={`resources-box ${msg.risk_level}`}
                                        >
                                            <strong>
                                                {['crisis', 'high'].includes(msg.risk_level) ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ShieldAlert size={16} /> Important Resources
                                                    </span>
                                                ) : 'Suggested Resources'}
                                            </strong>
                                            <ul>
                                                {msg.suggested_resources.map((res, ridx) => (
                                                    <li key={ridx}>
                                                        <Navigation size={14} style={{ flexShrink: 0, marginTop: '4px' }} />
                                                        <span>{res}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {isTyping && (
                        <div className="message-wrapper assistant">
                            <div className="message-bubble assistant">
                                <div className="typing-indicator">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="input-area">
                    <form onSubmit={handleSend} className="form-container">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                            autoFocus
                        />
                        <button type="submit" className="send-button" disabled={!input.trim() || isTyping}>
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </React.Fragment>
    );
};

export default ChatInterface;
