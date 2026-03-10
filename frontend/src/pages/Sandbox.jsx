import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Box, Terminal as TermIcon, BrainCircuit, Send, Sparkles, ChevronDown } from 'lucide-react';

import './Sandbox.css';

const LANGUAGE_CONFIGS = {
    python: {
        id: 'python',
        name: 'Python 3.10',
        monacoLanguage: 'python',
        defaultCode: 'def calculate_accuracy(correct, total):\n    """Calculate percentage score."""\n    if total == 0:\n        return 0\n    return (correct / total) * 100\n\n# Example Test\nscore = calculate_accuracy(18, 20)\nprint(f"Your Assessment Score: {score}%")',
        pistonLanguage: 'python',
        pistonVersion: '3.10.0',
        fileName: 'main.py'
    },
    c: {
        id: 'c',
        name: 'C (GCC)',
        monacoLanguage: 'c',
        defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}',
        pistonLanguage: 'c',
        pistonVersion: '10.2.0',
        fileName: 'main.c'
    },
    cpp: {
        id: 'cpp',
        name: 'C++ (G++)',
        monacoLanguage: 'cpp',
        defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!\\n";\n    return 0;\n}',
        pistonLanguage: 'c++',
        pistonVersion: '10.2.0',
        fileName: 'main.cpp'
    },
    java: {
        id: 'java',
        name: 'Java (JDK 15)',
        monacoLanguage: 'java',
        defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}',
        pistonLanguage: 'java',
        pistonVersion: '15.0.2',
        fileName: 'Main.java'
    },
    javascript: {
        id: 'javascript',
        name: 'JavaScript (Node)',
        monacoLanguage: 'javascript',
        defaultCode: 'function greet(name) {\n    return `Hello, ${name}!`;\n}\n\nconsole.log(greet("Developer"));',
        pistonLanguage: 'javascript',
        pistonVersion: '18.15.0',
        fileName: 'script.js'
    },
    typescript: {
        id: 'typescript',
        name: 'TypeScript (Deno)',
        monacoLanguage: 'typescript',
        defaultCode: 'function greet(name: string): string {\n    return `Hello, ${name}!`;\n}\n\nconsole.log(greet("TypeScript Developer"));',
        pistonLanguage: 'typescript',
        pistonVersion: '5.0.3',
        fileName: 'script.ts'
    },
    html: {
        id: 'html',
        name: 'HTML5',
        monacoLanguage: 'html',
        defaultCode: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Test Page</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n    <p>This is a test HTML document.</p>\n</body>\n</html>',
        fileName: 'index.html'
    },
    css: {
        id: 'css',
        name: 'CSS3',
        monacoLanguage: 'css',
        defaultCode: 'body {\n    background-color: #1a1a2e;\n    color: #e0e0e0;\n    font-family: Arial, sans-serif;\n}\n\nh1 {\n    color: #4CAF50;\n}',
        fileName: 'style.css'
    }
};

export default function Sandbox() {
    const [selectedLang, setSelectedLang] = useState('python');
    const [codes, setCodes] = useState(Object.fromEntries(
        Object.entries(LANGUAGE_CONFIGS).map(([k, v]) => [k, v.defaultCode])
    ));

    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isEngineReady, setIsEngineReady] = useState(false);

    // AI Chat state
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I am your GenAI Tutor. Need help with the coding sandbox?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const pyodideRef = useRef(null);
    const outputBufferRef = useRef('');

    useEffect(() => {
        console.log("Groq key loaded:", !!import.meta.env.VITE_GROQ_API_KEY);
    }, []);

    useEffect(() => {
        const initPyodide = async () => {
            try {
                if (!window.loadPyodide) {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
                    script.onload = async () => {
                        pyodideRef.current = await window.loadPyodide({
                            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
                            stdout: (text) => { outputBufferRef.current += text + '\n'; },
                            stderr: (text) => { outputBufferRef.current += text + '\n'; }
                        });
                        setIsEngineReady(true);
                    };
                    document.body.appendChild(script);
                } else {
                    pyodideRef.current = await window.loadPyodide({
                        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
                        stdout: (text) => { outputBufferRef.current += text + '\n'; },
                        stderr: (text) => { outputBufferRef.current += text + '\n'; }
                    });
                    setIsEngineReady(true);
                }
            } catch (err) {
                console.error("Pyodide loading error:", err);
            }
        };
        initPyodide();
    }, []);

    // Load practice task from Path Generator
    useEffect(() => {
        const savedTask = localStorage.getItem('sandbox_practice_task');
        if (savedTask) {
            try {
                const { topic, task, language } = JSON.parse(savedTask);

                // 1. Identify best matching language
                let matchedLang = 'python';
                if (language.includes('javascript') || language.includes('js')) matchedLang = 'javascript';
                else if (language.includes('html')) matchedLang = 'html';
                else if (language.includes('css')) matchedLang = 'css';
                else if (language.includes('java')) matchedLang = 'java';
                else if (language.includes('c++') || language.includes('cpp')) matchedLang = 'cpp';
                else if (language.includes('c')) matchedLang = 'c';

                setSelectedLang(matchedLang);

                // 2. Set code if it matches the topic or is empty
                setCodes(prev => ({ ...prev, [matchedLang]: `// Practice Task: ${topic}\n// ${task}\n\n` + (prev[matchedLang] || '') }));

                // 3. Add AI message
                setMessages(prev => [...prev, {
                    role: 'ai',
                    text: `I've loaded your practice task: "${topic}". The requirement is: ${task}. How can I help you implement this?`
                }]);

                // Cleanup
                localStorage.removeItem('sandbox_practice_task');
            } catch (e) {
                console.error("Error loading practice task:", e);
            }
        }
    }, []);

    const handleCodeChange = (value) => {
        setCodes(prev => ({ ...prev, [selectedLang]: value || '' }));
    };

    const handleReset = () => {
        setCodes(prev => ({ ...prev, [selectedLang]: LANGUAGE_CONFIGS[selectedLang].defaultCode }));
    };

    const runCode = async () => {
        const langConfig = LANGUAGE_CONFIGS[selectedLang];
        const currentCode = codes[selectedLang];

        setIsRunning(true);
        setOutput('');

        if (selectedLang === 'html' || selectedLang === 'css') {
            setOutput(`Verifying ${langConfig.name} Syntax...\n`);
            setTimeout(() => {
                let hasError = false;
                if (currentCode.trim() === '') {
                    setOutput(`[Error] ${langConfig.name} content cannot be empty.`);
                    hasError = true;
                } else if (selectedLang === 'html' && (!currentCode.includes('<') || !currentCode.includes('>'))) {
                    setOutput(`[Error] No valid HTML tags detected. Validation Failed!`);
                    hasError = true;
                } else if (selectedLang === 'css' && !currentCode.includes('{')) {
                    setOutput(`[Warning] No CSS rules detected. Ensure you have proper syntax.`);
                }

                if (!hasError) {
                    setOutput(`[Success] ${langConfig.name} syntax looks structurally correct!\n[Process completed with exit code 0]`);
                }
                setIsRunning(false);
            }, 800);
            return;
        }

        if (selectedLang === 'python') {
            if (!pyodideRef.current) {
                setOutput('Python engine is still loading. Please wait a moment...');
                setIsRunning(false);
                return;
            }
            outputBufferRef.current = 'Running python main.py...\n';
            try {
                await pyodideRef.current.runPythonAsync(currentCode);
                setOutput(outputBufferRef.current + '\n[Process completed with exit code 0]');
            } catch (err) {
                setOutput(outputBufferRef.current + '\n' + err.message + '\n[Process completed with exit code 1]');
            } finally {
                setIsRunning(false);
            }
            return;
        }

        // Use Piston API for C, C++, Java, JS, TS
        // Use Piston API v1 for C, C++, Java, JS, TS
        setOutput(`Compiling and running ${langConfig.name} via Remote Engine...\n`);

        try {
            const response = await fetch('https://emkc.org/api/v1/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language: langConfig.pistonLanguage,
                    source: currentCode
                    // v1 doesn't need version or multiline files array for basic snippets
                })
            });

            const data = await response.json();

            if (data.stderr) {
                setOutput(`Error:\n${data.stderr}\n[Process completed with exit code 1]`);
            } else if (data.stdout) {
                setOutput(`${data.stdout}\n[Process completed with exit code 0]`);
            } else if (data.message) {
                setOutput(`Execution Request Error: ${data.message || 'Unknown error occurred'}`);
            } else {
                setOutput(`(No output)\n[Process completed with exit code 0]`);
            }
        } catch (error) {
            setOutput(`Network Error: ${error.message}\nMake sure you have an active internet connection to evaluate ${langConfig.name}.`);
        } finally {
            setIsRunning(false);
        }
    };

    // AI client initialization removed as it's no longer needed for Groq fetch call

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userText = chatInput;
        const newMsg = { role: 'user', text: userText };
        setMessages(prev => [...prev, newMsg]);
        setChatInput('');
        setIsTyping(true);

        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        try {
            const prompt = `You are a helpful GenAI coding tutor assisting a student with ${LANGUAGE_CONFIGS[selectedLang].name}.\nThe student is working on the following code:\n\`\`\`${LANGUAGE_CONFIGS[selectedLang].monacoLanguage}\n${codes[selectedLang]}\n\`\`\`\n\nThe student asks: "${userText}"\nPlease provide a concise, helpful, and educational response.`;

            const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }]
                })
            });

            if (!res.ok) throw new Error("AI API failed");
            const data = await res.json();
            const text = data.choices[0].message.content;

            setMessages(prev => [...prev, {
                role: 'ai',
                text: text || "I couldn't generate a response. Please try again."
            }]);
        } catch (error) {
            console.error("Gemini API Error:", error);
            setMessages(prev => [...prev, {
                role: 'ai',
                text: "Sorry, I encountered an error connecting to my brain. Please check your API key and connection."
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const currentConfig = LANGUAGE_CONFIGS[selectedLang];

    return (
        <div className="sandbox-container">
            <header className="page-header animate-fade-in flex justify-between align-center" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)', paddingBottom: '1rem' }}>
                <div>
                    <h1 className="text-gradient flex align-center gap-2">
                        <Box size={28} /> AI Coding Sandbox
                    </h1>
                    <p className="text-secondary">Practice, experiment, and get real-time AI assistance across languages.</p>
                </div>

                <div className="flex gap-4 align-center">
                    <div className="language-selector-wrapper">
                        <select
                            value={selectedLang}
                            onChange={(e) => {
                                setSelectedLang(e.target.value);
                                setOutput('');
                            }}
                            className="language-select"
                        >
                            {Object.values(LANGUAGE_CONFIGS).map(lang => (
                                <option key={lang.id} value={lang.id}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="chevron-icon" />
                    </div>

                    <button className="btn btn-outline btn-sm" onClick={handleReset}>
                        <RotateCcw size={16} /> Reset
                    </button>
                    <button
                        className={`btn btn-primary btn-sm btn-glow ${(isRunning || (!isEngineReady && selectedLang === 'python')) ? 'opacity-50' : ''}`}
                        onClick={runCode}
                        disabled={isRunning || (!isEngineReady && selectedLang === 'python')}
                    >
                        <Play size={16} /> {isRunning ? 'Running...' : (!isEngineReady && selectedLang === 'python' ? 'Loading Engine...' : 'Run Code')}
                    </button>
                </div>
            </header>

            <div className="sandbox-workspace animate-fade-in mt-6">
                {/* Main Editor Panel */}
                <div className="editor-panel glass-panel">
                    <div className="panel-header flex justify-between align-center">
                        <span className="file-name">{currentConfig.fileName}</span>
                        <span className="language-badge">
                            {currentConfig.name}
                        </span>
                    </div>
                    <div className="editor-wrapper">
                        <Editor
                            height="100%"
                            language={currentConfig.monacoLanguage}
                            theme="vs-dark"
                            value={codes[selectedLang]}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                fontFamily: "'Courier New', monospace"
                            }}
                        />
                    </div>
                </div>

                {/* Sidebar panels */}
                <div className="side-panels">
                    {/* Output Terminal */}
                    <div className="terminal-panel glass-panel">
                        <div className="panel-header">
                            <span className="flex align-center gap-2 text-secondary font-semibold text-sm">
                                <TermIcon size={16} /> Console Output
                            </span>
                        </div>
                        <div className="terminal-content">
                            {isRunning ? (
                                <span className="text-muted blink">Executing...</span>
                            ) : (
                                <pre>{output || 'Ready.\nPress Run Code to see output here.'}</pre>
                            )}
                        </div>
                    </div>

                    {/* AI Chat Assistant */}
                    <div className="ai-chat-panel glass-panel">
                        <div className="panel-header bg-primary-light border-b border-primary" style={{ borderBottomColor: 'rgba(99, 102, 241, 0.3)' }}>
                            <span className="flex align-center gap-2 text-primary font-semibold text-sm">
                                <BrainCircuit size={16} /> GenAI Tutor Assistant
                            </span>
                        </div>

                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`chat-bubble ${msg.role}`}>
                                    {msg.role === 'ai' && <Sparkles size={14} className="ai-icon" />}
                                    <div className="bubble-text">{msg.text}</div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="chat-bubble ai typing-indicator">
                                    <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                                </div>
                            )}
                        </div>

                        <form className="chat-input-form" onSubmit={handleChatSubmit}>
                            <input
                                type="text"
                                placeholder={`Ask me about ${currentConfig.name}...`}
                                className="chat-input"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                            />
                            <button type="submit" className="btn-icon" disabled={!chatInput.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
