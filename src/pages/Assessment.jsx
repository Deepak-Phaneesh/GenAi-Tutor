import { useState, useEffect } from 'react';

import { useAuth } from '../lib/AuthContext';
import { updateProgressMetric } from '../lib/progress';
import { fetchAssessmentsTaken, saveAssessmentResult } from '../lib/analytics';
import {
    CheckSquare,
    Mail,
    Clock,
    CheckCircle2,
    Send,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    BrainCircuit,
    Sparkles,
    BookOpen,
    Target
} from 'lucide-react';
import './Assessment.css';



const DOMAIN_SKILLS = {
    'IT': ['Python', 'Machine Learning', 'Data Science', 'Web Development', 'Cyber Security'],
    'Non-IT': ['Psychology', 'Sociology', 'History'],
    'Business': ['Marketing', 'Finance', 'Entrepreneurship'],
    'Languages': ['English', 'Spanish', 'French']
};

export default function Assessment() {
    const { user } = useAuth();
    const [view, setView] = useState('list'); // list | loading | active | result
    const [showMailToast, setShowMailToast] = useState(false);
    const [mailType, setMailType] = useState('live');
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [finalScore, setFinalScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15 * 60);

    useEffect(() => {
        let timer;
        if (view === 'active' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && view === 'active') {
            submitAssessment();
        }
        return () => clearInterval(timer);
    }, [view, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const [generatorForm, setGeneratorForm] = useState({
        domain: 'IT',
        skill: 'Python',
        level: 'Beginner'
    });

    const [assessmentsData, setAssessmentsData] = useState([]);
    const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchAssessmentsTaken(user.id).then(data => {
                setAssessmentsData(data);
                setIsLoadingAssessments(false);
            });
        }
    }, [user, view]); // Re-fetch when view changes back to list

    // Update skill options when domain changes
    useEffect(() => {
        setGeneratorForm(prev => ({
            ...prev,
            skill: DOMAIN_SKILLS[prev.domain][0]
        }));
    }, [generatorForm.domain]);

    const triggerEmailMock = (type) => {
        setMailType(type);
        setShowMailToast(true);
        setTimeout(() => setShowMailToast(false), 3500);
    };

    const startAssessment = async (e) => {
        if (e) e.preventDefault();
        setView('loading');
        triggerEmailMock('live');

        const prompt = `Generate an assessment for the skill "${generatorForm.skill}" in the "${generatorForm.domain}" domain. The difficulty level should be "${generatorForm.level}".
Return the assessment in the following exact JSON format:
{
 "mcq_questions": [
  {
   "question": "What is...?",
   "options": ["A", "B", "C", "D"],
   "correct_answer": "A"
  }
 ]
}
Rules:
- Generate between 15 and 20 MCQ questions.
- Each MCQ MUST have exactly 4 options.
- Ensure the difficulty matches ${generatorForm.level}.
- The output MUST be a valid JSON object.
- Never output markdown formatting or backticks outside of what is required to transmit the JSON payload. Ensure it is parseable strings.`;

        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            alert("AI API Key is missing. Please check your environment variables.");
            setView('list');
            return;
        }

        let retries = 3;
        let success = false;
        let tempQuestions = [];

        while (retries > 0 && !success) {
            try {
                const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
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

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || response.statusText;
                    console.error("Gemini API Error:", response.status, errorMessage, errorData);
                    throw new Error(`API Error (${response.status}): ${errorMessage}`);
                }

                const responseData = await response.json();
                let rawJson = responseData.choices[0].message.content;
                if (rawJson.includes('\`\`\`json')) {
                    rawJson = rawJson.split('\`\`\`json')[1].split('\`\`\`')[0];
                } else if (rawJson.includes('\`\`\`')) {
                    rawJson = rawJson.split('\`\`\`')[1].split('\`\`\`')[0];
                }

                const data = JSON.parse(rawJson.trim());

                if (data && data.mcq_questions && data.mcq_questions.length > 0) {
                    tempQuestions = data.mcq_questions.map(q => {
                        const cIdx = q.options.indexOf(q.correct_answer);
                        return { type: 'mcq', text: q.question, options: q.options, answerIndex: cIdx >= 0 ? cIdx : 0 };
                    });

                    if (tempQuestions.length >= 10) { // Accept slight hallucinations in length if > 10
                        success = true;
                    } else {
                        throw new Error("Not enough questions generated.");
                    }
                } else {
                    throw new Error("Invalid output format.");
                }
            } catch (error) {
                console.error(`Gemini Assessment Gen Error (Retries left: ${retries - 1}):`, error);
                retries--;
            }
        }

        if (success) {
            setQuestions(tempQuestions);
            setCurrentIdx(0);
            setSelectedAnswers({});
            setTimeLeft(15 * 60);
            setView('active');
        } else {
            alert("Failed to generate assessment. The AI returned an invalid format or timed out. Please try again.");
            setView('list');
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            submitAssessment();
        }
    };

    const submitAssessment = async () => {
        setView('result');
        triggerEmailMock('result');

        let correctCount = 0;
        questions.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.answerIndex) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        setFinalScore(score);

        if (user?.id) {
            updateProgressMetric(user.id, { assessments_taken: 1, quiz_score: score });
            await saveAssessmentResult(
                user.id,
                generatorForm.domain,
                generatorForm.skill,
                generatorForm.level,
                score,
                questions.length
            );
            window.dispatchEvent(new Event('refresh-dashboard'));
        }
    };

    return (
        <div className="assessment-container page-container relative">
            <header className="page-header animate-fade-in mb-6">
                <h1 className="text-gradient mb-2">Assessments</h1>
                <p className="text-secondary mb-6">Evaluate your progress. Curriculums adapt based on your performance.</p>
            </header>

            {/* Email Simulation Toast */}
            {showMailToast && (
                <div className="mail-toast animate-slide-up glass-panel">
                    <Mail className="text-primary" size={24} />
                    <div>
                        <h4>Email Dispatched Successfully</h4>
                        <p className="text-sm text-secondary">
                            {mailType === 'live'
                                ? "Notification sent: 'Assessment is now live'"
                                : "Performance Report sent to user email"}
                        </p>
                    </div>
                </div>
            )}

            {/* List View */}
            {view === 'list' && (
                <>
                    <div className="glass-panel animate-fade-in p-8 mb-8 mt-4">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-light">
                            <BrainCircuit className="text-primary" size={28} />
                            <h3 className="m-0 text-xl font-semibold">AI Assessment Generator</h3>
                        </div>
                        <form onSubmit={startAssessment} className="generator-form">
                            <div className="input-group m-0 w-full">
                                <label className="input-label mb-2 block">Domain</label>
                                <select
                                    className="input-field select-field w-full"
                                    value={generatorForm.domain}
                                    onChange={e => setGeneratorForm({ ...generatorForm, domain: e.target.value })}
                                >
                                    {Object.keys(DOMAIN_SKILLS).map(domain => (
                                        <option key={domain} value={domain}>{domain}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group m-0 w-full">
                                <label className="input-label mb-2 block">Target Skill</label>
                                <select
                                    className="input-field select-field w-full"
                                    value={generatorForm.skill}
                                    onChange={e => setGeneratorForm({ ...generatorForm, skill: e.target.value })}
                                >
                                    {DOMAIN_SKILLS[generatorForm.domain].map(skill => (
                                        <option key={skill} value={skill}>{skill}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group m-0 w-full">
                                <label className="input-label mb-2 block">Level</label>
                                <select
                                    className="input-field select-field w-full"
                                    value={generatorForm.level}
                                    onChange={e => setGeneratorForm({ ...generatorForm, level: e.target.value })}
                                >
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            <div className="w-full">
                                <button type="submit" className="btn btn-primary w-full" style={{ height: '46px' }}>
                                    <Sparkles size={18} className="mr-2" /> Generate
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="assessments-table-wrapper animate-fade-in mt-6">
                        {isLoadingAssessments ? (
                            <div className="p-8 text-center text-secondary">Loading history...</div>
                        ) : assessmentsData.length === 0 ? (
                            <div className="p-8 text-secondary flex items-center justify-center gap-3 text-center w-full">
                                <CheckSquare size={32} className="opacity-50 flex-shrink-0" />
                                <p className="leading-relaxed m-0 text-left">
                                    <span className="font-semibold text-primary">No assessments taken yet.</span><br />Generate your first assessment above to test your knowledge.
                                </p>
                            </div>
                        ) : (
                            <table className="assessments-table text-left">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Course Domain</th>
                                        <th>Status</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessmentsData.map((assessment, i) => (
                                        <tr key={i} className="assessment-row">
                                            <td>
                                                <div className="font-semibold">{assessment.skill} Assessment</div>
                                                <div className="text-sm text-secondary mt-1">{assessment.level}</div>
                                            </td>
                                            <td className="text-secondary">{assessment.domain}</td>
                                            <td>
                                                <div className="status-pill completed">
                                                    <CheckCircle2 size={16} />
                                                    <span>Completed</span>
                                                </div>
                                            </td>
                                            <td className="font-semibold text-xl">
                                                <span style={{ color: assessment.score < 80 ? 'var(--error)' : 'var(--success)' }}>
                                                    {assessment.score}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Loading View */}
            {view === 'loading' && (
                <div className="glass-panel animate-fade-in text-center mt-6 p-12">
                    <div className="mb-6 mx-auto" style={{ width: '80px' }}>
                        <BrainCircuit size={48} className="text-primary animate-pulse-glow mx-auto" />
                    </div>
                    <h2 className="mb-2">Generating Dynamic Assessment</h2>
                    <p className="text-secondary mt-2">Our AI is analyzing your progress and creating tailored questions...</p>
                </div>
            )}

            {/* Active Assessment View */}
            {view === 'active' && questions.length > 0 && (
                <div className="active-assessment-view glass-panel animate-fade-in p-8 mt-4">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-light">
                        <div>
                            <h3 className="flex items-center gap-3 m-0">
                                Question {currentIdx + 1} of {questions.length}
                                <span className="badge">{questions[currentIdx]?.type === 'mcq' ? 'Multiple Choice' : 'Practical'}</span>
                            </h3>
                        </div>
                        <div className="text-warning font-mono text-xl font-semibold bg-black bg-opacity-30 px-4 py-1 rounded-full border border-warning border-opacity-30">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${((currentIdx) / questions.length) * 100}%` }}></div>
                        </div>

                        <h2 className="text-xl mb-6 leading-relaxed font-semibold">{questions[currentIdx].text}</h2>

                        {questions[currentIdx]?.type === 'mcq' && (
                            <div className="flex flex-col gap-3">
                                {questions[currentIdx].options.map((opt, i) => (
                                    <label key={i} className={`option-card cursor-pointer ${selectedAnswers[currentIdx] === i ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name={`q${currentIdx}`}
                                            className="hidden-radio"
                                            checked={selectedAnswers[currentIdx] === i}
                                            onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentIdx]: i })}
                                        />
                                        <div className="option-text">
                                            <div className="option-indicator"></div>
                                            <span>{opt}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-light">
                        <button
                            className="btn btn-outline"
                            disabled={currentIdx === 0}
                            onClick={() => setCurrentIdx(prev => prev - 1)}
                        >
                            Previous
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={nextQuestion}
                            disabled={selectedAnswers[currentIdx] === undefined}
                        >
                            {currentIdx === questions.length - 1 ? 'Calculate Score' : 'Next Question'} <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Result View */}
            {view === 'result' && (
                <div className="glass-panel animate-fade-in text-center p-8 mt-4 relative overflow-hidden">
                    {/* Background glow for result */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-primary opacity-5 blur-[100px] pointer-events-none rounded-full"></div>

                    <div className="score-circle" style={{ '--score-pct': `${finalScore}%`, '--score-color': finalScore >= 70 ? 'var(--success)' : (finalScore >= 50 ? 'var(--warning)' : 'var(--error)') }}>
                        <span className="score-value">{finalScore}%</span>
                    </div>

                    <h2 className="mb-2 text-2xl font-bold text-gradient">{generatorForm.skill} Assessment Logged</h2>
                    <p className="text-secondary mb-8">Your dashboard and analytics progress have been automatically synced.</p>

                    <div className="analysis-grid text-left">
                        <div className="analysis-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <h4 className="flex justify-between items-center gap-2 mb-3 text-success">
                                <span className="flex items-center gap-2"><CheckCircle2 size={20} /> Validated Score</span>
                            </h4>
                            <p className="font-semibold text-2xl mb-1">{Math.round((finalScore / 100) * questions.length)} / {questions.length}</p>
                            <p className="text-sm text-secondary">Correct Answers</p>
                        </div>
                        <div className="analysis-card" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                            <h4 className="flex items-center gap-2 mb-3 text-primary"><BookOpen size={20} /> Calibrated Level</h4>
                            <p className="font-semibold text-2xl mb-1">{generatorForm.level}</p>
                            <p className="text-sm text-secondary">{generatorForm.domain} Track</p>
                        </div>
                    </div>

                    <div className="adaptation-notice text-left">
                        <h4 className="text-primary flex items-center gap-2 mb-2 font-semibold">
                            <Sparkles size={20} /> AI Curriculum Adjustment
                        </h4>
                        <p className="text-secondary text-sm leading-relaxed m-0">
                            Based on your score, the learning path has been automatically updated to reflect your verified competency level.
                        </p>
                    </div>

                    <button className="btn btn-outline w-full max-w-md mx-auto" onClick={() => setView('list')}>
                        Return to Assessments
                    </button>
                </div>
            )}
        </div>
    );
}

