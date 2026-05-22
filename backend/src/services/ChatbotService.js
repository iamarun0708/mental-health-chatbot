const resources = {
    crisis: [
        "🆘 Emergency Support: Please call 988 Suicide & Crisis Lifeline (24/7 free support)",
        "💬 Crisis Text Line: Text HOME to 741741",
        "🏥 Emergency Services: Go to your nearest emergency room or call 911"
    ],
    high: [
        "📞 National Suicide Prevention Lifeline: 1-800-273-8255",
        "💬 Crisis Text Line: Text HOME to 741741", 
        "👥 Find a Therapist: Psychology Today Therapist Directory"
    ],
    medium: [
        "🧘 Guided Meditation: Try 'Headspace' or 'Calm' app",
        "📝 Therapy Options: BetterHelp or Talkspace for online therapy",
        "📚 Self-Help: 'Feeling Good' by Dr. David Burns"
    ],
    low: [
        "📖 Mental Health Education: PsychCentral articles",
        "🎧 Guided Relaxation: Progressive muscle relaxation audio",
        "✍️ Journaling: Daily mood tracking and reflection"
    ]
};

const crisisKeywords = [
    'suicide', 'kill myself', 'end my life', 'want to die',
    'suicidal', 'no reason to live', 'better off without me',
    'harm myself', 'self harm', 'ending it all'
];

const highRiskIndicators = [
    'depressed', 'hopeless', 'overwhelmed', 'can\'t cope', 
    'anxious', 'panic', 'scared', 'terrified', 'alone'
];

const mediumRiskIndicators = ['stressed', 'worried', 'nervous', 'sad', 'down'];

function analyzeRisk(text) {
    const textLower = text.toLowerCase();
    
    // Crisis detection
    const crisisFound = crisisKeywords.some(keyword => textLower.includes(keyword));
    if (crisisFound) {
        return { risk_level: "crisis", needs_immediate_help: true };
    }
    
    // High risk indicators
    const highFound = highRiskIndicators.some(indicator => textLower.includes(indicator));
    if (highFound) {
        return { risk_level: "high", needs_immediate_help: true };
    }
    
    // Medium risk indicators
    const mediumFound = mediumRiskIndicators.some(indicator => textLower.includes(indicator));
    if (mediumFound) {
        return { risk_level: "medium", needs_immediate_help: false };
    }
    
    return { risk_level: "low", needs_immediate_help: false };
}

function detectPhysicalSymptoms(text) {
    const textLower = text.toLowerCase();
    const symptomMap = {
        'fever': ['fever', 'temperature', 'hot', 'chills'],
        'cough': ['cough', 'coughing'],
        'headache': ['headache', 'head pain', 'migraine'],
        'vomiting': ['vomit', 'throwing up', 'nausea'],
        'breath': ['shortness of breath', 'cant breathe', 'difficulty breathing']
    };

    const found = [];
    const seriousIndicators = ['difficulty breathing', 'shortness of breath', 'cant breathe', 'severe', 'unconscious', 'persistent vomiting'];

    for (const [name, keywords] of Object.entries(symptomMap)) {
        for (const kw of keywords) {
            if (textLower.includes(kw)) {
                found.push(name);
                break;
            }
        }
    }

    if (found.length === 0) {
        return { symptoms: [], severity: 'none' };
    }

    if (seriousIndicators.some(ind => textLower.includes(ind))) {
        return { symptoms: found, severity: 'serious' };
    }

    if (found.includes('vomiting') && (found.includes('fever') || found.includes('breath'))) {
        return { symptoms: found, severity: 'serious' };
    }

    return { symptoms: found, severity: 'minor' };
}

function getEmpathicResponse(userInput) {
    const input = userInput.toLowerCase();
    
    if (['sad', 'depressed', 'down'].some(w => input.includes(w))) {
        return "I'm really sorry you're feeling this way. It's brave of you to talk about it. Would you like to share more about what's been on your mind?";
    } else if (['anxious', 'worried', 'scared', 'nervous'].some(w => input.includes(w))) {
        return "Anxiety can feel overwhelming. Remember to breathe - you've gotten through difficult moments before. What's been causing these feelings?";
    } else if (['stressed', 'overwhelmed', 'pressure'].some(w => input.includes(w))) {
        return "It sounds like you have a lot on your plate. Sometimes breaking things down into smaller steps can help. What's been the most challenging part?";
    } else if (['angry', 'frustrated', 'mad'].some(w => input.includes(w))) {
        return "It's completely valid to feel angry. These emotions can be powerful. Would you like to talk about what's been frustrating you?";
    } else if (['lonely', 'alone', 'isolated'].some(w => input.includes(w))) {
        return "Feeling lonely can be really difficult. Please know that you're not alone in feeling this way. What does loneliness feel like for you right now?";
    } else {
        return "Thank you for sharing how you're feeling. I'm here to listen and support you through this. Could you tell me more about what's been happening?";
    }
}

function getSupportiveResponse(userInput) {
    const input = userInput.toLowerCase();
    
    if (['happy', 'good', 'great', 'better'].some(w => input.includes(w))) {
        return "I'm glad to hear you're doing well! 😊 It's wonderful that you're feeling positive. What's been making your day good?";
    } else if (['hello', 'hi', 'hey'].some(w => input.includes(w))) {
        return "Hello! I'm your Calm Companion. I'm here to listen and support you. How has your day been going?";
    } else if (['thank', 'thanks'].some(w => input.includes(w))) {
        return "You're very welcome! I'm glad I could be here for you. Is there anything else you'd like to talk about?";
    } else {
        const responses = [
            "Thank you for sharing. How does that make you feel?",
            "I appreciate you opening up. Tell me more about that.",
            "That's interesting. Could you elaborate a bit more?",
            "I'm listening. What else is on your mind?",
            "Thank you for trusting me with this. How has this been affecting you?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

async function generateResponse(userInput, analysis, history = []) {
    if (analysis.risk_level === 'crisis') {
        return {
            response: "I'm deeply concerned about what you're sharing. Your safety is the absolute priority right now. Please connect with professional support immediately - you don't have to go through this alone.",
            suggested_resources: resources.crisis,
            risk_level: "crisis",
            needs_immediate_help: true
        };
    } else if (analysis.risk_level === 'high') {
        return {
            response: "It sounds like you're going through a very difficult time. It's important to connect with professional support who can help you through this.",
            suggested_resources: resources.high,
            risk_level: "high",
            needs_immediate_help: true
        };
    } else if (analysis.risk_level === 'medium') {
        return {
            response: getEmpathicResponse(userInput),
            suggested_resources: resources.medium,
            risk_level: "medium",
            needs_immediate_help: false
        };
    } else {
        return {
            response: getSupportiveResponse(userInput),
            suggested_resources: resources.low,
            risk_level: "low",
            needs_immediate_help: false
        };
    }
}

module.exports = {
    resources,
    analyzeRisk,
    detectPhysicalSymptoms,
    generateResponse
};
