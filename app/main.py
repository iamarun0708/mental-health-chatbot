from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
from typing import Dict, List, Optional
import uuid
import os
from pathlib import Path
import asyncio
from .kb_client import KBClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Mental Health Chatbot API",
    description="AI-powered mental health support",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve static directory relative to this file so it works regardless of cwd
BASE_DIR = Path(__file__).resolve().parent
static_dir = (BASE_DIR / ".." / "static").resolve()
os.makedirs(static_dir, exist_ok=True)

# Serve static files (use string path)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Store conversation history
conversation_store = {}

class MentalHealthChatbot:
    def __init__(self):
        # Crisis detection patterns
        self.crisis_keywords = [
            'suicide', 'kill myself', 'end my life', 'want to die',
            'suicidal', 'no reason to live', 'better off without me',
            'harm myself', 'self harm', 'ending it all'
        ]
        
        # Support resources
        self.resources = {
            'crisis': [
                "🆘 Emergency Support: Please call 988 Suicide & Crisis Lifeline (24/7 free support)",
                "💬 Crisis Text Line: Text HOME to 741741",
                "🏥 Emergency Services: Go to your nearest emergency room or call 911"
            ],
            'high': [
                "📞 National Suicide Prevention Lifeline: 1-800-273-8255",
                "💬 Crisis Text Line: Text HOME to 741741", 
                "👥 Find a Therapist: Psychology Today Therapist Directory"
            ],
            'medium': [
                "🧘 Guided Meditation: Try 'Headspace' or 'Calm' app",
                "📝 Therapy Options: BetterHelp or Talkspace for online therapy",
                "📚 Self-Help: 'Feeling Good' by Dr. David Burns"
            ],
            'low': [
                "📖 Mental Health Education: PsychCentral articles",
                "🎧 Guided Relaxation: Progressive muscle relaxation audio",
                "✍️ Journaling: Daily mood tracking and reflection"
            ]
        }

    async def analyze_risk(self, text: str) -> Dict:
        """Analyze message for risk level"""
        text_lower = text.lower()
        
        # Crisis detection
        crisis_found = any(keyword in text_lower for keyword in self.crisis_keywords)
        
        if crisis_found:
            return {
                "risk_level": "crisis",
                "needs_immediate_help": True
            }
        
        # High risk indicators
        high_risk_indicators = [
            'depressed', 'hopeless', 'overwhelmed', 'can\'t cope', 
            'anxious', 'panic', 'scared', 'terrified', 'alone'
        ]
        high_found = any(indicator in text_lower for indicator in high_risk_indicators)
        
        if high_found:
            return {
                "risk_level": "high",
                "needs_immediate_help": True
            }
        
        # Medium risk indicators
        medium_indicators = ['stressed', 'worried', 'nervous', 'sad', 'down']
        medium_found = any(indicator in text_lower for indicator in medium_indicators)
        
        if medium_found:
            return {
                "risk_level": "medium",
                "needs_immediate_help": False
            }
        
        return {
            "risk_level": "low",
            "needs_immediate_help": False
        }

    async def generate_response(self, user_input: str, analysis: Dict, conversation_history: List[Dict] = None) -> Dict:
        """Generate response using rule-based logic"""
        
        # Crisis response
        if analysis['risk_level'] == 'crisis':
            return {
                "response": "I'm deeply concerned about what you're sharing. Your safety is the absolute priority right now. Please connect with professional support immediately - you don't have to go through this alone.",
                "suggested_resources": self.resources['crisis'],
                "risk_level": "crisis",
                "needs_immediate_help": True
            }
        
        # High risk response
        elif analysis['risk_level'] == 'high':
            return {
                "response": "It sounds like you're going through a very difficult time. It's important to connect with professional support who can help you through this.",
                "suggested_resources": self.resources['high'],
                "risk_level": "high",
                "needs_immediate_help": True
            }
        
        # Medium risk
        elif analysis['risk_level'] == 'medium':
            response = self._get_empathic_response(user_input)
            return {
                "response": response,
                "suggested_resources": self.resources['medium'],
                "risk_level": "medium",
                "needs_immediate_help": False
            }
        
        # Low risk
        else:
            response = self._get_supportive_response(user_input)
            return {
                "response": response,
                "suggested_resources": self.resources['low'],
                "risk_level": "low",
                "needs_immediate_help": False
            }

    def _get_empathic_response(self, user_input: str) -> str:
        """Get empathic response based on user input"""
        user_input_lower = user_input.lower()
        
        if any(word in user_input_lower for word in ['sad', 'depressed', 'down']):
            return "I'm really sorry you're feeling this way. It's brave of you to talk about it. Would you like to share more about what's been on your mind?"
        
        elif any(word in user_input_lower for word in ['anxious', 'worried', 'scared', 'nervous']):
            return "Anxiety can feel overwhelming. Remember to breathe - you've gotten through difficult moments before. What's been causing these feelings?"
        
        elif any(word in user_input_lower for word in ['stressed', 'overwhelmed', 'pressure']):
            return "It sounds like you have a lot on your plate. Sometimes breaking things down into smaller steps can help. What's been the most challenging part?"
        
        elif any(word in user_input_lower for word in ['angry', 'frustrated', 'mad']):
            return "It's completely valid to feel angry. These emotions can be powerful. Would you like to talk about what's been frustrating you?"
        
        elif any(word in user_input_lower for word in ['lonely', 'alone', 'isolated']):
            return "Feeling lonely can be really difficult. Please know that you're not alone in feeling this way. What does loneliness feel like for you right now?"
        
        else:
            return "Thank you for sharing how you're feeling. I'm here to listen and support you through this. Could you tell me more about what's been happening?"

    def _get_supportive_response(self, user_input: str) -> str:
        """Get supportive response for low-risk situations"""
        user_input_lower = user_input.lower()
        
        if any(word in user_input_lower for word in ['happy', 'good', 'great', 'better']):
            return "I'm glad to hear you're doing well! 😊 It's wonderful that you're feeling positive. What's been making your day good?"
        
        elif any(word in user_input_lower for word in ['hello', 'hi', 'hey']):
            return "Hello! I'm your Calm Companion. I'm here to listen and support you. How has your day been going?"
        
        elif any(word in user_input_lower for word in ['thank', 'thanks']):
            return "You're very welcome! I'm glad I could be here for you. Is there anything else you'd like to talk about?"
        
        else:
            responses = [
                "Thank you for sharing. How does that make you feel?",
                "I appreciate you opening up. Tell me more about that.",
                "That's interesting. Could you elaborate a bit more?",
                "I'm listening. What else is on your mind?",
                "Thank you for trusting me with this. How has this been affecting you?"
            ]
            import random
            return random.choice(responses)

    def detect_physical_symptoms(self, text: str) -> Dict:
        """Detect common physical symptoms and classify severity.

        Returns a dict: { 'symptoms': [...], 'severity': 'minor'|'serious'|'none' }
        """
        text_lower = text.lower()
        symptom_map = {
            'fever': ['fever', 'temperature', 'hot', 'chills'],
            'cough': ['cough', 'coughing'],
            'headache': ['headache', 'head pain', 'migraine'],
            'vomiting': ['vomit', 'throwing up', 'nausea'],
            'breath': ['shortness of breath', 'cant breathe', 'difficulty breathing']
        }

        found = []
        serious_indicators = ['difficulty breathing', 'shortness of breath', 'cant breathe', 'severe', 'unconscious', 'persistent vomiting']

        for name, keywords in symptom_map.items():
            for kw in keywords:
                if kw in text_lower:
                    found.append(name)
                    break

        if not found:
            return {'symptoms': [], 'severity': 'none'}

        # If any serious indicator appears, classify as serious
        if any(ind in text_lower for ind in serious_indicators):
            return {'symptoms': found, 'severity': 'serious'}

        # Simple heuristic: vomiting + fever or breath issues => serious
        if 'vomiting' in found and ('fever' in found or 'breath' in found):
            return {'symptoms': found, 'severity': 'serious'}

        return {'symptoms': found, 'severity': 'minor'}

# Global chatbot instance
chatbot = MentalHealthChatbot()

# Initialize KB client (local dataset)
kb = KBClient()

@app.get("/")
async def serve_frontend():
    """Serve the frontend HTML"""
    index_path = Path(static_dir) / "index.html"
    if not index_path.exists():
        # Return a simple HTML response if index.html is missing
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend not found")

    return FileResponse(str(index_path))

@app.post("/chat")
async def chat_endpoint(message: dict):
    """Main chat endpoint for mental health support"""
    try:
        user_input = message.get("message", "").strip()
        user_id = message.get("user_id", "anonymous")
        session_id = message.get("session_id", "default")

        if not user_input:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )

        # Get conversation history
        user_key = f"{user_id}_{session_id}"
        history = conversation_store.get(user_key, [])

        # Analyze risk level
        risk_analysis = await chatbot.analyze_risk(user_input)

        # Detect physical symptoms
        phys = chatbot.detect_physical_symptoms(user_input)

        # Generate response
        # If crisis/high risk, use rule-based immediately.
        if risk_analysis['risk_level'] in ("crisis", "high"):
            response_data = await chatbot.generate_response(user_input, risk_analysis, history)
        else:
            # For medium/low risk, use local KB dataset for deterministic responses.
            entry = kb.query(user_input)
            response_data = {
                "response": entry.get('response', ''),
                "suggested_resources": chatbot.resources.get(risk_analysis['risk_level'], []),
                "risk_level": entry.get('risk_level', risk_analysis['risk_level']),
                "needs_immediate_help": risk_analysis.get('needs_immediate_help', False)
            }

        # If physical symptoms detected, add guidance
        if phys['severity'] == 'minor':
            response_data.setdefault('response', '')
            response_data['response'] += "\n\nNote: I noticed you mentioned some physical symptoms (" + ", ".join(phys['symptoms']) + "). For minor symptoms like a mild fever or cough, rest, fluids, and over-the-counter remedies may help. If symptoms worsen, consider seeing a doctor."

        elif phys['severity'] == 'serious':
            # Construct a Google Maps query for nearby doctors; use provided location if any
            location = message.get('location')  # expected as 'City, State' or 'lat,lng'
            if location:
                query = f"doctors near {location}"
            else:
                query = "doctors near me"

            maps_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
            response_data.setdefault('response', '')
            response_data['response'] += "\n\nI see potentially serious physical symptoms (" + ", ".join(phys['symptoms']) + "). I recommend seeking medical attention right away. You can find nearby doctors or urgent care here: " + maps_url
            response_data['needs_immediate_help'] = True

        # Update conversation history
        history.extend([
            {"role": "user", "content": user_input},
            {"role": "assistant", "content": response_data.get("response", "")}
        ])
        conversation_store[user_key] = history[-10:]  # Keep last 10 messages

        logger.info(f"Chat response for user {user_id}: Risk level {response_data['risk_level']}")

        return response_data

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )


@app.on_event("shutdown")
async def shutdown_event():
    # Nothing to close for the simple KB client
    return

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "ollama_available": False,
        "model_loaded": True,
        "model": "rule-based"
    }


@app.post("/admin/reload_kb")
async def admin_reload_kb():
    """Reload the KB dataset from disk (useful for editing entries without restarting)."""
    try:
        kb.reload()
        return {"reloaded": True, "entries": len(kb.entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversation/{user_id}")
async def get_conversation_history(user_id: str):
    """Get conversation history for a user"""
    user_conversations = {}
    for key in conversation_store:
        if key.startswith(f"{user_id}_"):
            user_conversations[key] = conversation_store[key]
    
    return {"user_id": user_id, "conversations": user_conversations}

if __name__ == "__main__":
    import uvicorn

    # Run the ASGI app object directly to avoid module import path issues
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )