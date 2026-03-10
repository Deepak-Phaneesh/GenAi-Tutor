import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { fetchActiveLearningPath } from '../lib/analytics';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import './Chat.css';

export default function Chat() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        { role: 'model', content: "Hello! I am your AI Tutor. I can help answer questions, clarify doubts, or dive deeper into any topics you're studying. What's on your mind?" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activePath, setActivePath] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        console.log("Groq key loaded:", !!import.meta.env.VITE_GROQ_API_KEY);
    }, []);

    useEffect(() => {
        const loadContext = async () => {
            if (user?.id) {
                const path = await fetchActiveLearningPath(user.id);
                if (path) {
                    setActivePath(path);
                    // Add a subtle system message about context being loaded
                    console.log("Chat context loaded for:", path.skill);
                }
            }
        };
        loadContext();
    }, [user]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to UI immediately
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        const url = "https://api.groq.com/openai/v1/chat/completions";

        try {
            // Construct context from active path
            let contextPrompt = "";
            if (activePath) {
                const currentWeek = Math.floor(activePath.progress / (100 / activePath.weeks)) + 1;
                contextPrompt = `
CONTEXT: The student is currently following a learning path for "${activePath.skill}" (${activePath.level} level). 
They have completed approximately ${activePath.progress}% of their ${activePath.weeks}-week course. 
They are likely studying topics related to Week ${currentWeek > activePath.weeks ? activePath.weeks : currentWeek}.
`;
            }

            const systemPrompt = `You are an AI tutor helping a student learn.
            Student question: ${userMessage}
            ${contextPrompt}
            
            Explain clearly with examples and simple steps.`;

            const requestBody = {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 1000
            };

            let res = await fetch(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            // Auto-retry once for 429
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 2000)); // Short wait for chat
                res = await fetch(url, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error?.message || "AI API failed");
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't formulate a response. Could you try asking in a different way?";

            setMessages(prev => [...prev, { role: 'model', content: reply }]);
        } catch (error) {
            console.error("Chatbot Error:", error);
            const errorMessage = (!import.meta.env.VITE_GROQ_API_KEY)
                ? "AI service configuration error. Please check API key."
                : "Error: Could not connect to the AI network. Please try again later.";
            setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="chat-container animate-fade-in">
            <header className="chat-header glass-panel">
                <div className="flex align-center gap-4">
                    <div className="bot-avatar header-avatar pulse-animation">
                        <Bot size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-gradient mb-1">AI Tutor Assistant</h2>
                        <p className="text-sm text-secondary flex align-center gap-1">
                            {activePath ? (
                                <><Sparkles size={14} className="text-primary" /> Personalized for {activePath.skill}</>
                            ) : (
                                <><Sparkles size={14} className="text-success" /> Online & AI-Powered</>
                            )}
                        </p>
                    </div>
                </div>
            </header>

            <div className="chat-window glass-panel mt-6">
                <div className="messages-area">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'model'} animate-fade-in`}>
                            {msg.role === 'model' && (
                                <div className="bot-avatar small">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}

                            <div className="message-bubble">
                                {msg.content.split('\n').map((line, i) => (
                                    <p key={i} className={line === '' ? 'mb-4' : 'mb-1'}>{line}</p>
                                ))}
                            </div>

                            {msg.role === 'user' && (
                                <div className="user-avatar small">
                                    <User size={16} className="text-white" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="message-wrapper model animate-fade-in">
                            <div className="bot-avatar small">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="message-bubble typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area border-t border-light mt-4 pt-4">
                    <form onSubmit={handleSend} className="chat-form">
                        <input
                            type="text"
                            className="input-field chat-input"
                            placeholder="Ask me to clarify a topic, debug code, or explain a concept..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary btn-icon chat-send-btn"
                            disabled={!input.trim() || isTyping}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
