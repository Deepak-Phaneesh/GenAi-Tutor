import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { updateProgressMetric } from '../lib/progress';
import {
    saveLearningPath,
    fetchActiveLearningPath,
    saveLearningPathAssessment,
    saveLearningSession,
    saveWeeklyAssessmentResult,
    saveStructuredLearningPath,
    updateStructuredWeek,
    saveWeeklyAssessment
} from '../lib/analytics';
import { getFallbackPath } from '../lib/curriculumData';
import {
    Wand2,
    MapPin,
    GraduationCap,
    Clock,
    ChevronRight,
    Sparkles,
    Search,
    CheckCircle2,
    CalendarDays,
    Terminal,
    ExternalLink,
    Youtube,
    BookOpen,
    Code
} from 'lucide-react';
import './PathGenerator.css';

const GEMINI_URL = (apiKey) =>
    `https://api.groq.com/openai/v1/chat/completions`;

// Wrapper with auto-retry until 2-minute timeout
const geminiRequest = async (apiKey, body, setLoadingMsg) => {
    const url = GEMINI_URL(apiKey);
    const opts = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    };

    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
        attempt++;
        const elapsed = Date.now() - startTime;

        if (elapsed >= TIMEOUT_MS) {
            throw new Error('AI request timed out after 2 minutes. Please try again.');
        }

        try {
            const res = await fetch(url, opts);

            if (res.status === 429 || res.status === 503) {
                // Rate limited or service unavailable — check remaining time before retrying
                const errData = await res.json().catch(() => ({}));
                const status = errData?.error?.status || '';
                const remaining = TIMEOUT_MS - (Date.now() - startTime);

                if (remaining <= 0) {
                    throw new Error('AI request timed out after 2 minutes. Please try again.');
                }

                // For rate limits, wait up to 30s; for others, wait 3s
                const waitTime = status === 'RESOURCE_EXHAUSTED' ? Math.min(30000, remaining) : Math.min(3000, remaining);
                const elapsed_s = Math.round((Date.now() - startTime) / 1000);
                if (setLoadingMsg) setLoadingMsg(`AI is busy. Retrying... (${elapsed_s}s elapsed, max 2 min)`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const remaining = TIMEOUT_MS - (Date.now() - startTime);
                if (remaining <= 5000) {
                    throw new Error(JSON.stringify(err.error || err));
                }
                // Non-rate-limit error — short wait then retry
                const elapsed_s = Math.round((Date.now() - startTime) / 1000);
                if (setLoadingMsg) setLoadingMsg(`Connection issue. Retrying... (${elapsed_s}s elapsed)`);
                await new Promise(r => setTimeout(r, Math.min(3000, remaining)));
                continue;
            }

            const data = await res.json();
            const text = data.choices[0].message.content;
            let jsonStr = text;
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                jsonStr = match[0];
            } else {
                jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            return JSON.parse(jsonStr);
        } catch (error) {
            // If this is our own timeout error, re-throw it
            if (error.message.includes('timed out')) throw error;

            const remaining = TIMEOUT_MS - (Date.now() - startTime);
            if (remaining <= 0) {
                throw new Error('AI request timed out after 2 minutes. Please try again.');
            }

            const elapsed_s = Math.round((Date.now() - startTime) / 1000);
            if (setLoadingMsg) setLoadingMsg(`Connection error. Retrying... (${elapsed_s}s elapsed)`);
            await new Promise(r => setTimeout(r, Math.min(3000, remaining)));
        }
    }
};

const geminiTextFetch = async (apiKey, promptText, onStatus) => {
    const url = `https://api.groq.com/openai/v1/chat/completions`;
    const body = JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: promptText }]
    });

    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    const startTime = Date.now();

    while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= TIMEOUT_MS) {
            throw new Error('AI request timed out after 2 minutes. Please try again.');
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body
            });

            if (res.status === 429 || res.status === 503) {
                const errData = await res.json().catch(() => ({}));
                const isRateLimit = errData?.error?.status === 'RESOURCE_EXHAUSTED';
                const remaining = TIMEOUT_MS - (Date.now() - startTime);
                if (remaining <= 0) throw new Error('AI request timed out after 2 minutes. Please try again.');
                const waitTime = isRateLimit ? Math.min(30000, remaining) : Math.min(3000, remaining);
                const elapsed_s = Math.round((Date.now() - startTime) / 1000);
                if (onStatus) onStatus(`AI is busy. Retrying... (${elapsed_s}s elapsed, max 2 min)`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            if (!res.ok) {
                const errText = await res.text();
                const remaining = TIMEOUT_MS - (Date.now() - startTime);
                if (remaining <= 5000) throw new Error(`API Error ${res.status}: ${errText}`);
                const elapsed_s = Math.round((Date.now() - startTime) / 1000);
                if (onStatus) onStatus(`Connection issue. Retrying... (${elapsed_s}s elapsed)`);
                await new Promise(r => setTimeout(r, Math.min(3000, remaining)));
                continue;
            }

            const raw = await res.json();
            const text = raw?.choices?.[0]?.message?.content || '';
            let jsonStr = text;
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                jsonStr = match[0];
            } else {
                jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            }
            return JSON.parse(jsonStr);
        } catch (error) {
            if (error.message.includes('timed out')) throw error;
            const remaining = TIMEOUT_MS - (Date.now() - startTime);
            if (remaining <= 0) throw new Error('AI request timed out after 2 minutes. Please try again.');
            const elapsed_s = Math.round((Date.now() - startTime) / 1000);
            if (onStatus) onStatus(`Connection error. Retrying... (${elapsed_s}s elapsed)`);
            await new Promise(r => setTimeout(r, Math.min(3000, remaining)));
        }
    }
};

export default function PathGenerator() {
    useEffect(() => {
        console.log("Groq key loaded:", !!import.meta.env.VITE_GROQ_API_KEY);
    }, []);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Select criteria, 2: Loading, 3: Exam, 4: Result
    const [formData, setFormData] = useState({
        domain: 'it',
        skill: '',
        level: '1',
        weeks: '4'
    });
    const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

    const domains = [
        { id: 'it', label: 'IT & Software' },
        { id: 'non-it', label: 'Business & Non-IT' },
        { id: 'lang', label: 'Languages' }
    ];

    const getDomainLabel = (id) => {
        const found = [
            { id: 'it', label: 'IT & Software' },
            { id: 'non-it', label: 'Business & Non-IT' },
            { id: 'lang', label: 'Languages' }
        ].find(d => d.id === id);
        return found ? found.label : id;
    };

    const [generatedData, setGeneratedData] = useState(null);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [scorePercentage, setScorePercentage] = useState(0);

    const [completedDays, setCompletedDays] = useState({}); // { 'weekIdx-dayIdx': true }
    const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);

    // { weekIdx: number, questions: [], currentIdx: 0, answers: {}, loading: boolean }
    const [activeWeeklyAssessment, setActiveWeeklyAssessment] = useState(null);

    // { weekIdx: number, dayIdx: number, data: object }
    const [activeLearningDay, setActiveLearningDay] = useState(null);

    const [pathId, setPathId] = useState(null);

    // { topic: string, questions: [], currentIdx: 0, answers: {}, loading: boolean }
    const [activeQuickQuiz, setActiveQuickQuick] = useState(null);

    // Sync state to dashboard
    useEffect(() => {
        if (generatedData && step >= 4) {
            const syncPath = async () => {
                if (user?.id) {
                    const result = await saveLearningPath(user.id, {
                        id: pathId, // Pass the known ID if we have it
                        skill: formData.skill,
                        domain: formData.domain,
                        level: formData.level,
                        weeks: formData.weeks,
                        data: {
                            ...generatedData,
                            completedDays
                        }
                    });
                    if (result && result.id && !pathId) {
                        setPathId(result.id);
                    }
                    window.dispatchEvent(new Event('refresh-dashboard'));
                }
            };
            syncPath();
        }
    }, [generatedData, completedDays, step, formData, user, pathId]);

    // Restore state from dashboard
    useEffect(() => {
        const loadActivePath = async () => {
            if (user?.id) {
                const activePath = await fetchActiveLearningPath(user.id);
                if (activePath && activePath.path_data && !hasStartedGeneration) {
                    setFormData({
                        skill: activePath.skill,
                        domain: activePath.domain,
                        level: activePath.level,
                        weeks: activePath.weeks
                    });

                    const pData = activePath.path_data;
                    setPathId(activePath.id);
                    setCompletedDays(pData.completedDays || {});
                    setGeneratedData({ exam: pData.exam, path: pData.path });
                    setStep(4); // Jump directly to the result view
                }
            }
        };
        loadActivePath();
    }, [user]);

    const handleGenerate = async (e) => {
        e.preventDefault();

        // Read values directly from the form DOM to avoid stale closure / overwrite issues
        const formEl = e.target;
        const skillValue = (formEl.elements['skill']?.value || formData.skill || '').trim();
        const domainValue = formEl.elements['domain']?.value || formData.domain;
        const levelValue = formEl.elements['level']?.value || formData.level;
        const weeksValue = formEl.elements['weeks']?.value || formData.weeks;

        // Sync to state so the rest of the component stays consistent
        const currentForm = { skill: skillValue, domain: domainValue, level: levelValue, weeks: weeksValue };
        setFormData(currentForm);

        console.log("Generating path for skill:", skillValue, "| domain:", domainValue, "| level:", levelValue, "| weeks:", weeksValue);

        if (!skillValue) {
            alert('Please enter a skill or topic to learn.');
            return;
        }

        setStep(2);
        setHasStartedGeneration(true);
        setCurrentQuestionIndex(0);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                alert("AI service configuration error. Please check API key.");
                setStep(1);
                return;
            }

            const domainLabel = getDomainLabel(currentForm.domain);
            const isNonProgramming = currentForm.domain === 'lang' || currentForm.domain === 'non-it';

            const prompt = `Generate a complete learning curriculum as a JSON object for the skill: ${currentForm.skill}.

Domain: ${domainLabel}
User Level: ${currentForm.level}
Duration: ${currentForm.weeks} weeks.

Rules:
1. Each week must introduce NEW, unique topics only.
2. Topics must progressively increase in difficulty.
3. Do NOT repeat topics from any previous week.
4. Each week must contain exactly 7 days (Day 1-6 are learning days, Day 7 is the assessment day).
5. Each day must have: day number, topic title, content explanation (2+ sentences), duration (e.g. "2 hours"), and practice_suggestion.
6. Also include a 5-question pre-assessment exam with text, options array (4 choices), and answerIndex (0-3).

IMPORTANT: The entire curriculum must be SPECIFICALLY about "${currentForm.skill}" in the context of "${domainLabel}". Do NOT generate a generic curriculum.${isNonProgramming ? `
CRITICAL: This is a "${domainLabel}" curriculum, NOT a programming curriculum. Do NOT include any Python, JavaScript, or coding topics. All content must be about "${currentForm.skill}" only.` : ''}

Respond with ONLY a valid JSON object in this exact format, no extra text:
{
  "exam": [{"text": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0}],
  "path": [
    {
      "week": 1,
      "title": "Week Title",
      "days": [
        {"day": 1, "topic": "...", "content": "...", "duration": "2 hours", "practice_suggestion": "..."}
      ]
    }
  ]
}`;

            const data = await geminiTextFetch(apiKey, prompt, (msg) => console.log(msg));

            // Part 4: Prevent Duplicate Content
            const pathArrayCheck = data.path || data.curriculum || data.weeks;
            if (pathArrayCheck && Array.isArray(pathArrayCheck)) {
                const allTopics = pathArrayCheck.flatMap(w => (w.days || []).map(d => (d.topic || '').toLowerCase().trim()));
                const uniqueTopics = new Set(allTopics);
                if (uniqueTopics.size < allTopics.length) {
                    console.log("Duplicate topics detected. Regenerating curriculum...");
                    return handleGenerate(e); // Simple recursion for one-time fix
                }
            }

            setGeneratedData(data);

            // Part 3: Store structured data in Supabase
            if (user?.id) {
                const pathArray = data.path || data.curriculum || data.weeks || [];
                const savedPath = await saveLearningPath(user.id, {
                    domain: currentForm.domain,
                    skill: currentForm.skill,
                    level: currentForm.level,
                    weeks: currentForm.weeks,
                    data: pathArray
                });

                if (savedPath) {
                    setPathId(savedPath.id);
                    // Save structured data (Weeks and Days)
                    const structuredWeeks = pathArray.map((week, wIdx) => ({
                        weekNumber: week.week || wIdx + 1,
                        title: week.title,
                        days: week.days.map(day => ({
                            dayNumber: day.day,
                            topic: day.topic,
                            content: day.content,
                            duration: day.duration,
                            practice_suggestion: day.practice_suggestion
                        }))
                    }));
                    await saveStructuredLearningPath(user.id, savedPath.id, structuredWeeks);
                }
                updateProgressMetric(user.id, { learning_paths_created: 1 });
                window.dispatchEvent(new Event('refresh-dashboard'));
            }

            setSelectedAnswers({});
            setStep(3);
        } catch (error) {
            console.error("Gemini Path Generation Error:", error);

            // Try Fallback Method
            console.log("Attempting Rule-Based Fallback generation...");
            try {
                const fallbackData = getFallbackPath(currentForm.skill, currentForm.weeks);
                setGeneratedData(fallbackData);
                setSelectedAnswers({});
                setPathId(null);
                setStep(3);
                if (user?.id) updateProgressMetric(user.id, { learning_paths_created: 1 });
            } catch (fallbackError) {
                console.error("Fallback Error:", fallbackError);
                alert(`AI Error: ${error.message || 'Unknown error. Please check your API key and try again.'}`);
                setStep(1);
            }
        }
    };

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Robust extraction helpers
    const getExamArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) {
            const row = data.find(d => d.exam);
            if (row) return Array.isArray(row.exam) ? row.exam : (row.exam.questions || []);
            return [];
        }
        if (data.exam) return Array.isArray(data.exam) ? data.exam : (data.exam.questions || []);
        if (data.questions) return Array.isArray(data.questions) ? data.questions : [];
        return [];
    };

    const getPathArray = (data) => {
        if (!data) return null;
        if (Array.isArray(data)) {
            const row = data.find(d => d.path || d.curriculum || d.weeks);
            if (row) return row.path || row.curriculum || row.weeks;
            // Maybe the array itself is the path
            if (data.length > 0 && data[0].days) return data;
        }
        if (data.path) return data.path;
        if (data.curriculum) return data.curriculum;
        if (data.weeks) return data.weeks;
        return null;
    };

    const examArray = getExamArray(generatedData);
    const pathArray = getPathArray(generatedData);

    const handleExamNext = () => {
        if (!examArray.length) return;

        if (currentQuestionIndex < examArray.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Calculate final score
            let correctCount = 0;
            examArray.forEach((q, idx) => {
                if (selectedAnswers[idx] === q.answerIndex) {
                    correctCount++;
                }
            });
            const score = Math.round((correctCount / examArray.length) * 100);
            setScorePercentage(score);
            setStep(4); // Show the final path
        }
    };

    const toggleDayCompletion = (weekIdx, dayIdx) => {
        const key = `${weekIdx}-${dayIdx}`;
        setCompletedDays(prev => ({
            ...prev,
            [key]: true // Ensure it ONLY marks complete now, no toggling off from timeline manually
        }));
    };

    const handleOpenLearningDay = (weekIdx, dayIdx, dayData) => {
        setActiveLearningDay({
            weekIdx,
            dayIdx,
            data: dayData
        });
    };

    const handleFinishLearningDay = async () => {
        if (!activeLearningDay) return;
        toggleDayCompletion(activeLearningDay.weekIdx, activeLearningDay.dayIdx);
        const dayTopic = activeLearningDay.data.topic || formData.skill;
        setActiveLearningDay(null);
        if (user?.id) {
            updateProgressMetric(user.id, { hours_learned: 1 });
            await saveLearningSession(user.id, formData.skill || 'Custom', dayTopic, 1);
            window.dispatchEvent(new Event('refresh-dashboard'));
        }
    };

    const isWeekFullyCompleted = (weekIdx) => {
        // A week has 6 topic days
        for (let i = 0; i < 6; i++) {
            if (!completedDays[`${weekIdx}-${i}`]) return false;
        }
        return true;
    };

    const handleStartPractice = (dayData) => {
        // Prepare data for Sandbox
        const practicePayload = {
            topic: dayData.topic,
            task: dayData.practice_task,
            language: formData.skill.toLowerCase() // Simple heuristic
        };
        localStorage.setItem('sandbox_practice_task', JSON.stringify(practicePayload));
        navigate('/app/sandbox');
    };

    const handleWeeklyAssessmentComplete = async (weekIdx, score) => {
        const isLastWeek = weekIdx >= (generatedData.path || []).length - 1;

        // Mark Day 7 complete inherently
        const key = `${weekIdx}-6`;
        setCompletedDays(prev => ({ ...prev, [key]: true }));

        // 1. Save results to the detailed table
        if (user?.id) {
            const currentWeekData = generatedData.path[weekIdx];
            const weeklyTopics = (currentWeekData.days || []).map(d => d.topic).filter(Boolean);

            saveWeeklyAssessmentResult(
                user.id,
                pathId,
                weekIdx + 1,
                formData.skill || 'Custom',
                weeklyTopics,
                score,
                activeWeeklyAssessment?.questions?.length || 15
            );

            updateProgressMetric(user.id, { assessments_taken: 1 });
            window.dispatchEvent(new Event('refresh-dashboard'));
        }

        // 2. If score is high or it's the last week, just close
        if (score >= 70 || isLastWeek) {
            setActiveWeeklyAssessment(null);
            if (score >= 70 && !isLastWeek) {
                alert(`Great job! You scored ${score}%. Week ${weekIdx + 2} is unlocked.`);
            }
            return;
        }

        // 3. Score < 70% - Adaptive Regeneration
        setIsUpdatingTimeline(true);
        setActiveWeeklyAssessment(null);

        try {
            const nextWeekNum = weekIdx + 2;
            const currentWeekData = (generatedData.path || [])[weekIdx];
            const currentWeekTopics = (currentWeekData.days || []).map(d => d.topic).join(', ');
            const nextWeekOriginal = (generatedData.path || [])[weekIdx + 1];

            const prompt = `The user scored ${score}% in the weekly assessment.
            Weak topics: ${currentWeekTopics}.
            Planned next week: ${nextWeekOriginal.title}.
            
            Modify the next week's learning plan to include revision of the weak topics for the first 2 days and then continue with the planned topics at a suitable pace.
            
            Format:
            Week ${nextWeekNum}:
            Day 1 - Topic...
            Day 7 - Weekly Assessment Topics.
            
            Return ONLY a valid JSON object for the NEW Week ${nextWeekNum}, matching the schema exactly (title, days array with 7 elements).`;

            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error('API Key is missing');

            const responseSchema = {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    days: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                dayNumber: { type: 'integer' },
                                topic: { type: 'string' },
                                explanation: { type: 'string' },
                                practice_exercise: { type: 'string' },
                                assessment_topics: { type: 'string' }
                            }
                        }
                    }
                }
            };

            const updatedNextWeek = await geminiRequest(apiKey, {
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                messages: [{ role: "user", content: prompt }]
            }, null);

            setGeneratedData(prev => {
                const newPath = [...prev.path];
                newPath[weekIdx + 1] = updatedNextWeek;
                return { ...prev, path: newPath };
            });

            // Update database
            if (pathId) {
                await updateStructuredWeek(pathId, nextWeekNum, updatedNextWeek);
            }

            alert(`Assessment score: ${score}%. Since this is below 70%, we've dynamically updated Week ${nextWeekNum} to include revision of previous topics!`);
        } catch (error) {
            console.error("Error updating timeline:", error);
            alert("Could not update timeline. Proceeding with standard Week " + (weekIdx + 2));
        } finally {
            setIsUpdatingTimeline(false);
        }
    };

    const startWeeklyAssessment = async (weekIdx) => {
        setActiveWeeklyAssessment({
            weekIdx,
            questions: [],
            currentIdx: 0,
            answers: {},
            loading: true
        });

        const currentWeekData = generatedData.path[weekIdx];
        const topics = currentWeekData.days.filter(d => d.topic).map(d => d.topic).join(', ');

        const prompt = `Generate exactly 15 multiple-choice quiz questions based ONLY on these topics: ${topics}.

Difficulty: Level ${formData.level}.

Respond with ONLY a valid JSON object in this exact format, no extra text:
{"questions":[{"question":"...","options":["A","B","C","D"],"answer":"A"}]}`;

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                alert("AI service configuration error. Please check API key.");
                setActiveWeeklyAssessment(null);
                return;
            }

            const data = await geminiTextFetch(apiKey, prompt, (msg) => {
                setActiveWeeklyAssessment(prev => prev ? { ...prev, loading: true } : prev);
                console.log('Assessment:', msg);
            });

            if (data && data.questions) {
                const formattedQuestions = data.questions.map(q => ({
                    type: 'mcq',
                    text: q.question,
                    options: q.options,
                    answerIndex: q.options.indexOf(q.answer) >= 0 ? q.options.indexOf(q.answer) : 0
                }));

                if (pathId) {
                    await saveWeeklyAssessment(pathId, weekIdx + 1, data.questions);
                }

                setActiveWeeklyAssessment(prev => ({
                    ...prev,
                    questions: formattedQuestions,
                    loading: false
                }));
            } else {
                throw new Error("Invalid assessment data received");
            }
        } catch (error) {
            console.error("Error generating assessment:", error);
            // Retry once silently
            try {
                const { getFallbackAssessment } = await import('../lib/curriculumData');
                const fallbackQs = getFallbackAssessment(formData.skill);
                setActiveWeeklyAssessment(prev => ({
                    ...prev,
                    questions: fallbackQs,
                    loading: false
                }));
            } catch (err) {
                console.error("Assessment Fallback Error:", err);
                alert("Failed to generate assessment. Please try again later.");
                setActiveWeeklyAssessment(null);
            }
        }
    };

    const startQuickQuiz = async (topic) => {
        setActiveQuickQuick({
            topic,
            questions: [],
            currentIdx: 0,
            answers: {},
            loading: true
        });

        const prompt = `Generate exactly 5 multiple-choice quiz questions for the topic: "${topic}".

Respond with ONLY a valid JSON object in this exact format, no extra text:
{"questions":[{"question":"...","options":["A","B","C","D"],"answer":"A"}]}`;

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                alert("AI service configuration error. Please check API key.");
                setActiveQuickQuick(null);
                return;
            }

            const data = await geminiTextFetch(apiKey, prompt, (msg) => console.log('Quiz:', msg));

            if (data && data.questions) {
                const formattedQs = data.questions.map(q => {
                    const cIdx = q.options.indexOf(q.answer);
                    return { text: q.question, options: q.options, answerIndex: cIdx >= 0 ? cIdx : 0 };
                });
                setActiveQuickQuick(prev => ({ ...prev, questions: formattedQs, loading: false }));
            } else {
                throw new Error('Invalid quiz data format.');
            }
        } catch (error) {
            console.error("Quick Quiz Error:", error);
            alert("Could not generate quiz. Please try again.");
            setActiveQuickQuick(null);
        }
    };

    const handleWeeklyNextBtn = () => {
        const state = activeWeeklyAssessment;
        if (state.currentIdx < state.questions.length - 1) {
            setActiveWeeklyAssessment(prev => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
        } else {
            // submit and score
            let correctCount = 0;
            const mcqQuestions = state.questions.filter(q => q.type === 'mcq');

            mcqQuestions.forEach((q, idx) => {
                const actualIdxInAnswers = state.questions.findIndex(allQ => allQ === q);
                if (state.answers[actualIdxInAnswers] === q.answerIndex) {
                    correctCount++;
                }
            });

            // If there are no MCQs, default to 100% so progress isn't blocked, 
            // though the prompt forces 5 MCQs. Coding questions are not auto-graded yet.
            let score = 100;
            if (mcqQuestions.length > 0) {
                score = Math.round((correctCount / mcqQuestions.length) * 100);
            }

            handleWeeklyAssessmentComplete(state.weekIdx, score);
        }
    };

    return (
        <>
            <div className="path-container">
                <header className="page-header animate-fade-in">
                    <h1 className="text-gradient">AI Path Generator</h1>
                    <p className="text-secondary">Customized curriculums tailored to your goals and schedule.</p>
                </header>

                {/* Step 1: Configuration Form */}
                {step === 1 && (
                    <div className="generator-grid mt-6">
                        <form className="generator-form glass-panel animate-fade-in" onSubmit={handleGenerate}>
                            <div className="form-section">
                                <h3><MapPin className="text-primary" size={20} /> Domain & Skill</h3>

                                <div className="input-group">
                                    <label className="input-label">Select Domain</label>
                                    <div className="radio-grid">
                                        {domains.map(d => (
                                            <label key={d.id} className={`radio-card small ${formData.domain === d.id ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="domain"
                                                    value={d.id}
                                                    className="hidden-radio"
                                                    checked={formData.domain === d.id}
                                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                                />
                                                <span>{d.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="input-group mt-6">
                                    <label className="input-label">Target Skill / Topic</label>
                                    <div className="input-wrapper">
                                        <Search size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            name="skill"
                                            className="input-field with-icon"
                                            placeholder="e.g. Python, Digital Marketing, Spanish..."
                                            value={formData.skill}
                                            onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section mt-8">
                                <h3><GraduationCap className="text-secondary" size={20} /> Expertise & Timeline</h3>

                                <div className="input-group">
                                    <label className="input-label">Current Level (1-5)</label>
                                    <div className="range-wrapper">
                                        <input
                                            type="range"
                                            min="1" max="5"
                                            value={formData.level}
                                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                            className="range-slider"
                                        />
                                        <div className="range-labels mt-2">
                                            <div className="flex flex-col items-center" style={{ width: '40px', marginLeft: '-10px' }}>
                                                <span>1</span>
                                                <span className="text-xs text-secondary mt-1">Beginner</span>
                                            </div>
                                            <div className="flex flex-col items-center" style={{ width: '40px' }}>
                                                <span>2</span>
                                            </div>
                                            <div className="flex flex-col items-center" style={{ width: '40px' }}>
                                                <span>3</span>
                                            </div>
                                            <div className="flex flex-col items-center" style={{ width: '40px' }}>
                                                <span>4</span>
                                            </div>
                                            <div className="flex flex-col items-center" style={{ width: '40px', marginRight: '-10px' }}>
                                                <span>5</span>
                                                <span className="text-xs text-secondary mt-1">Expert</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="input-group mt-6">
                                    <label className="input-label">Duration (Weeks)</label>
                                    <div className="input-wrapper">
                                        <Clock size={18} className="input-icon" />
                                        <select
                                            className="input-field with-icon select-field"
                                            value={formData.weeks}
                                            onChange={(e) => setFormData({ ...formData, weeks: e.target.value })}
                                        >
                                            {[4, 6, 8, 10, 12].map(w => (
                                                <option key={w} value={w}>{w} Weeks</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full mt-8 btn-glow">
                                <Sparkles size={20} /> Generate Intelligence Path
                            </button>
                        </form>

                        {/* Side Info */}
                        <div className="generator-info animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <div className="info-card glass-panel">
                                <Wand2 size={32} className="text-secondary mb-4" />
                                <h3 className="mb-2">How it works</h3>
                                <ul className="info-list">
                                    <li><CheckCircle2 size={16} className="text-success" /> Tell us what you want to learn.</li>
                                    <li><CheckCircle2 size={16} className="text-success" /> Our AI Agent designs a custom curriculum.</li>
                                    <li><CheckCircle2 size={16} className="text-success" /> Take a quick exam to gauge your exact skill level.</li>
                                    <li><CheckCircle2 size={16} className="text-success" /> Follow your daily bite-sized tasks & weekly assessments.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Loading State */}
                {step === 2 && (
                    <div className="loading-state glass-panel animate-fade-in text-center mt-6">
                        <div className="ai-loader mb-6">
                            <div className="ring ring-1"></div>
                            <div className="ring ring-2"></div>
                            <div className="ring ring-3"></div>
                            <BrainCircuit size={48} className="text-primary pulse-animation" />
                        </div>
                        <h2>Building your Neural Pathway...</h2>
                        <p className="text-secondary mt-2">Analyzing {formData.skill || 'topic'} constraints across {formData.weeks} weeks.</p>
                    </div>
                )}

                {/* Step 3: Initial Exam */}
                {step === 3 && (
                    <div className="exam-card glass-panel animate-fade-in mt-6">
                        {examArray.length === 0 ? (
                            <div className="text-center py-8">
                                <h2 className="text-secondary mb-4">Assessment Skipped</h2>
                                <p className="mb-6">The AI did not generate a multiple choice assessment. Proceeding to your learning path.</p>
                                <button className="btn btn-primary" onClick={() => setStep(4)}>View Curricullum <ChevronRight size={18} /></button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <span className="badge mb-4">Level Assessment</span>
                                    <h2>Confidence Score Exam</h2>
                                    <p className="text-secondary">Before we finalize your path, let's verify your Level {formData.level} expertise.</p>
                                </div>

                                <div className="mock-question glass-panel">
                                    <span className="q-number">Question {currentQuestionIndex + 1}/{examArray.length}</span>
                                    <h4 className="mt-2 mb-6">{examArray[currentQuestionIndex]?.text}</h4>

                                    <div className="options-stack">
                                        {examArray[currentQuestionIndex]?.options?.map((opt, i) => (
                                            <label key={i} className={`radio-card option-card ${selectedAnswers[currentQuestionIndex] === i ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name={`q${currentQuestionIndex}`}
                                                    className="hidden-radio"
                                                    checked={selectedAnswers[currentQuestionIndex] === i}
                                                    onChange={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: i }))}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between mt-8">
                                    <button
                                        className="btn btn-outline"
                                        disabled={currentQuestionIndex === 0}
                                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleExamNext}
                                        disabled={selectedAnswers[currentQuestionIndex] === undefined}
                                    >
                                        {currentQuestionIndex === examArray.length - 1 ? 'Complete Exam' : 'Next'} <ChevronRight size={18} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 4: Generated Result */}
                {step === 4 && (
                    <div className="result-view animate-fade-in mt-6">
                        {!pathArray || !Array.isArray(pathArray) || pathArray.length === 0 ? (
                            <div className="glass-panel text-center py-12">
                                <h2 className="text-error mb-4">Generation Error</h2>
                                <p className="text-secondary mb-6">The AI returned an invalid curriculum structure. Please try generating it again. It may take a couple attempts for complex queries.</p>
                                <button className="btn btn-primary" onClick={() => { setStep(1); setGeneratedData(null); }}>Start Over</button>
                            </div>
                        ) : (
                            <>
                                <div className="result-header glass-panel mb-6">
                                    <div className="flex justify-between align-start flex-wrap gap-4">
                                        <div>
                                            <h2>{formData.skill || 'Custom'} Masterclass</h2>
                                            <div className="flex gap-4 mt-2 text-secondary">
                                                <span className="flex align-center gap-2"><MapPin size={16} /> {formData.domain.toUpperCase()}</span>
                                                <span className="flex align-center gap-2"><GraduationCap size={16} /> Level {formData.level}</span>
                                                <span className="flex align-center gap-2"><Clock size={16} /> {formData.weeks} Weeks</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="confidence-score mb-1">
                                                <strong className={`${scorePercentage >= 70 ? 'text-success' : (scorePercentage >= 40 ? 'text-warning' : 'text-error')} text-lg`}>
                                                    {scorePercentage}%
                                                </strong> Score
                                            </div>
                                            <p className="text-sm text-secondary">Based on assessment</p>
                                        </div>
                                    </div>

                                    {/* Temporarily kept as "Reset/Start Over" - logic later to mark as complete/inactive */}
                                    <button className="btn btn-primary w-full mt-6" onClick={() => { setStep(1); setCompletedDays({}); setGeneratedData(null); setHasStartedGeneration(false); }}>
                                        Restart Path Generator
                                    </button>

                                    {isUpdatingTimeline && (
                                        <div className="alert-info mt-4 p-3 bg-primary-light border border-primary rounded text-sm text-center flex justify-center align-center gap-2">
                                            <Sparkles size={16} className="pulse-animation text-primary" /> AI is dynamically regenerating your curriculum based on your assessment...
                                        </div>
                                    )}
                                </div>
                                <div className="timeline-grid mt-4">
                                    {pathArray.map((week, idx) => {
                                        const isWeekUnlocked = idx === 0 || isWeekFullyCompleted(idx - 1);

                                        return (
                                            <div key={idx} className={`timeline-week glass-panel ${!isWeekUnlocked ? 'opacity-50 grayscale' : ''}`}>
                                                <div className="week-header flex justify-between align-center">
                                                    <h4>Week {idx + 1}: {week.title}</h4>
                                                    {!isWeekUnlocked && <span className="badge bg-dark">Locked</span>}
                                                    {isWeekUnlocked && isWeekFullyCompleted(idx) && <span className="badge bg-success-light text-success"><CheckCircle2 size={12} className="mr-1 inline" /> Completed</span>}
                                                </div>

                                                <div className="days-list mt-4">
                                                    {week.days && week.days.map((day, dIdx) => {
                                                        const isCompleted = completedDays[`${idx}-${dIdx}`];
                                                        return (
                                                            <div
                                                                key={dIdx}
                                                                className={`day-item ${isCompleted ? 'completed border-success bg-success-light' : ''} ${!isWeekUnlocked ? 'pointer-events-none' : 'cursor-pointer hover-glow'}`}
                                                                onClick={() => isWeekUnlocked && handleOpenLearningDay(idx, dIdx, day)}
                                                            >
                                                                <div className={`day-marker ${isCompleted ? 'bg-success text-white' : ''}`}>
                                                                    {isCompleted ? <CheckCircle2 size={16} /> : `Day ${dIdx + 1}`}
                                                                </div>
                                                                <div className="day-content">
                                                                    <p className={`font-semibold ${isCompleted ? 'line-through text-secondary' : ''}`}>{day.topic}</p>
                                                                    <div className="flex justify-between align-center mt-1">
                                                                        <span className="text-xs text-secondary truncate" style={{ maxWidth: '200px' }}>{day.content || day.explanation}</span>
                                                                        <span className="text-xs text-primary font-medium">{day.duration}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}

                                                    {/* Assessment Day for every week */}
                                                    <div className="day-item assessment-day mt-4 pt-4 border-t border-light">
                                                        <div className={`day-marker ${isWeekFullyCompleted(idx) ? 'bg-warning text-dark' : 'bg-dark text-muted'}`}>Day 7</div>
                                                        <div className="day-content flex justify-between align-center flex-wrap gap-2 w-full">
                                                            <div>
                                                                <p className={`font-semibold ${isWeekFullyCompleted(idx) ? 'text-warning' : 'text-muted'}`}>Weekly Checkpoint Assessment</p>
                                                                <span className="text-xs text-secondary">Dynamic • AI Graded</span>
                                                            </div>

                                                            {isWeekFullyCompleted(idx) && !completedDays[`${idx}-6`] && (
                                                                <div className="flex gap-2 w-full mt-2">
                                                                    <button
                                                                        className="btn btn-primary btn-sm flex-1 btn-glow"
                                                                        onClick={() => startWeeklyAssessment(idx)}
                                                                    >
                                                                        Take Weekly Assessment
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {completedDays[`${idx}-6`] && (
                                                                <span className="text-xs text-success flex align-center mt-2 font-bold w-full"><CheckCircle2 size={12} className="mr-1 inline" /> PASSED</span>
                                                            )}
                                                            {!isWeekFullyCompleted(idx) && (
                                                                <span className="text-xs italic text-secondary w-full block mt-2">Complete Days 1-6 to unlock</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Weekly Assessment Live Modal */}
            {
                activeWeeklyAssessment && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="exam-card glass-panel w-full max-w-2xl animate-fade-in mx-4" style={{ margin: 'auto' }}>

                            {activeWeeklyAssessment.loading && (
                                <div className="text-center py-12">
                                    <Sparkles size={48} className="text-primary pulse-animation mx-auto mb-6" />
                                    <h2>Generating Live Assessment...</h2>
                                    <p className="text-secondary mt-2">Connecting to AI to test your Week {activeWeeklyAssessment.weekIdx + 1} knowledge...</p>
                                </div>
                            )}

                            {!activeWeeklyAssessment.loading && activeWeeklyAssessment.questions.length > 0 && (
                                <>
                                    <div className="text-center mb-8">
                                        <span className="badge mb-4">Week {activeWeeklyAssessment.weekIdx + 1} Assessment</span>
                                        <h2>Knowledge Checkpoint</h2>
                                    </div>

                                    <div className="mock-question glass-panel">
                                        <div className="flex justify-between align-center mb-2">
                                            <span className="q-number">Question {activeWeeklyAssessment.currentIdx + 1} of {activeWeeklyAssessment.questions.length}</span>
                                            <span className="badge">{activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.type === 'mcq' ? 'Multiple Choice' : 'Practical / Coding'}</span>
                                        </div>
                                        <h4 className="mt-2 mb-6">{activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.text}</h4>

                                        {activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.type === 'mcq' ? (
                                            <div className="options-stack">
                                                {activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.options.map((opt, i) => (
                                                    <label key={i} className={`radio-card option-card ${activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i ? 'selected' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name={`wq${activeWeeklyAssessment.currentIdx}`}
                                                            className="hidden-radio"
                                                            checked={activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i}
                                                            onChange={() => setActiveWeeklyAssessment(prev => ({
                                                                ...prev,
                                                                answers: { ...prev.answers, [prev.currentIdx]: i }
                                                            }))}
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <textarea
                                                className="input-field mt-4 w-full font-mono text-sm"
                                                style={{ minHeight: '150px', background: 'rgba(0,0,0,0.3)' }}
                                                placeholder="Write your code or answer here..."
                                                value={activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] || ''}
                                                onChange={(e) => setActiveWeeklyAssessment(prev => ({
                                                    ...prev,
                                                    answers: { ...prev.answers, [prev.currentIdx]: e.target.value }
                                                }))}
                                            />
                                        )}
                                    </div>

                                    <div className="flex justify-between mt-8">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => setActiveWeeklyAssessment(null)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleWeeklyNextBtn}
                                            disabled={
                                                activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === undefined ||
                                                (activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.type === 'coding' && !activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx].trim())
                                            }
                                        >
                                            {activeWeeklyAssessment.currentIdx === activeWeeklyAssessment.questions.length - 1 ? 'Submit & Grade' : 'Next Question'} <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Daily Subject Learning Modal */}
            {
                activeLearningDay && activeLearningDay.data && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="exam-card glass-panel w-full max-w-3xl animate-fade-in mx-4" style={{ margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="text-center mb-6">
                                <span className="badge mb-2">Week {activeLearningDay.weekIdx + 1} • Day {activeLearningDay.dayIdx + 1}</span>
                                <h2 className="text-gradient">{activeLearningDay.data.topic}</h2>
                                <p className="text-secondary mt-1">{activeLearningDay.data.duration}</p>
                            </div>

                            <div className="learning-content text-left space-y-6">
                                <div className="p-4 bg-dark rounded border border-light">
                                    <h4 className="flex align-center gap-2 mb-2"><Sparkles size={18} className="text-primary" /> Explanation</h4>
                                    <p className="text-sm leading-relaxed text-secondary">{activeLearningDay.data.content || activeLearningDay.data.explanation}</p>
                                </div>

                                {activeLearningDay.data.key_concepts && (
                                    <div className="mt-4">
                                        <h4 className="flex align-center gap-2 mb-2"><BrainCircuit size={18} className="text-secondary" /> Key Concepts</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {activeLearningDay.data.key_concepts.map((concept, i) => (
                                                <span key={i} className="badge bg-primary-light text-primary border border-primary">{concept}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeLearningDay.data.example && (
                                    <div className="mt-4">
                                        <h4 className="mb-2">Example</h4>
                                        <pre className="p-3 bg-dark rounded border border-light text-sm overflow-x-auto text-success-light">
                                            {activeLearningDay.data.example}
                                        </pre>
                                    </div>
                                )}

                                {activeLearningDay.data.practice_task && (
                                    <div className="mt-4 p-4 border border-warning rounded bg-warning-light">
                                        <h4 className="flex align-center gap-2 mb-2 text-warning"><CheckCircle2 size={18} /> Practice Task</h4>
                                        <p className="text-sm">{activeLearningDay.data.practice_task}</p>
                                    </div>
                                )}

                                {activeLearningDay.data.resources && (
                                    <div className="mt-4">
                                        <h4 className="flex align-center gap-2 mb-3"><BookOpen size={18} className="text-secondary" /> Study Resources</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {activeLearningDay.data.resources.map((link, i) => {
                                                const isYoutube = link.includes('youtube.com') || link.includes('youtu.be');
                                                return (
                                                    <a
                                                        key={i}
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex align-center gap-3 p-3 rounded bg-dark border border-light hover:border-primary transition-all text-sm group"
                                                    >
                                                        {isYoutube ? <Youtube size={18} className="text-error" /> : <ExternalLink size={18} className="text-primary" />}
                                                        <span className="text-secondary group-hover:text-primary truncate">{link}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-8 pt-4 border-t border-light gap-4">
                                <button className="btn btn-outline" onClick={() => setActiveLearningDay(null)}>
                                    Read Later
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-outline flex align-center gap-2"
                                        onClick={() => startQuickQuiz(activeLearningDay.data.topic)}
                                    >
                                        <Sparkles size={18} className="text-primary" /> Quick Quiz
                                    </button>
                                    <div className="p-4 bg-primary-light rounded border border-primary">
                                        <h4 className="flex align-center gap-2 mb-2 text-primary"><Terminal size={18} /> Practice Task</h4>
                                        <p className="text-sm text-secondary">{activeLearningDay.data.practice_suggestion || activeLearningDay.data.practice_exercise}</p>
                                        <button
                                            className="btn btn-primary btn-sm mt-4 hover-glow"
                                            onClick={() => handleStartPractice(activeLearningDay.data)}
                                        >
                                            Start in Sandbox
                                        </button>
                                    </div>
                                    <button className="btn btn-primary btn-glow" onClick={handleFinishLearningDay}>
                                        Mark as Complete & Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Weekly Assessment Overlay */}
            {activeWeeklyAssessment && (
                <div className="modal-overlay flex items-center justify-center p-4 z-[1000]">
                    <div className="exam-card glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-up relative">
                        <div className="sticky top-0 bg-dark py-4 z-10 border-b border-light mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="badge mb-2">Week {activeWeeklyAssessment.weekIdx + 1} Assessment</span>
                                    <h2>Knowledge Evaluation</h2>
                                </div>
                                <button className="close-btn" onClick={() => setActiveWeeklyAssessment(null)}>✕</button>
                            </div>
                        </div>

                        {activeWeeklyAssessment.loading ? (
                            <div className="text-center py-20">
                                <Sparkles size={48} className="text-primary pulse-animation mx-auto mb-6" />
                                <h2>Dynamic Assessment Generation</h2>
                                <p className="text-secondary">AI is creating custom questions based on this week's topics...</p>
                            </div>
                        ) : (
                            <div className="exam-body mt-4">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-sm font-semibold">Question {activeWeeklyAssessment.currentIdx + 1}/{activeWeeklyAssessment.questions.length}</span>
                                    <div className="progress-bar-small w-48">
                                        <div className="progress-fill" style={{ width: `${((activeWeeklyAssessment.currentIdx + 1) / activeWeeklyAssessment.questions.length) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div className="mock-question glass-panel p-6 shadow-xl">
                                    <h3 className="mb-8">{activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx].text}</h3>

                                    {activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx].type === 'mcq' ? (
                                        <div className="options-stack">
                                            {activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx].options.map((opt, i) => (
                                                <label key={i} className={`radio-card option-card ${activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i ? 'selected' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="weekly-option"
                                                        className="hidden-radio"
                                                        checked={activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i}
                                                        onChange={() => setActiveWeeklyAssessment(prev => ({
                                                            ...prev,
                                                            answers: { ...prev.answers, [prev.currentIdx]: i }
                                                        }))}
                                                    />
                                                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                                                    <span className="option-text">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="coding-practical p-4 bg-black rounded-lg border border-primary border-opacity-30">
                                            <p className="text-sm text-secondary mb-4 italic">This is a practical assessment question. Write your approach below (or use the Sandbox later).</p>
                                            <textarea
                                                className="text-input w-full min-h-[150px] bg-transparent text-white p-2"
                                                placeholder="Describe your solution or write code here..."
                                                value={activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] || ''}
                                                onChange={(e) => setActiveWeeklyAssessment(prev => ({
                                                    ...prev,
                                                    answers: { ...prev.answers, [prev.currentIdx]: e.target.value }
                                                }))}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between mt-10">
                                    <button
                                        className="btn btn-outline"
                                        disabled={activeWeeklyAssessment.currentIdx === 0}
                                        onClick={() => setActiveWeeklyAssessment(prev => ({ ...prev, currentIdx: prev.currentIdx - 1 }))}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-primary btn-glow"
                                        onClick={handleWeeklyNextBtn}
                                    >
                                        {activeWeeklyAssessment.currentIdx < activeWeeklyAssessment.questions.length - 1 ? 'Next Question' : 'Submit Assessment'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Quiz Overlay */}
            {activeQuickQuiz && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[1100] flex items-center justify-center p-4">
                    <div className="exam-card glass-panel w-full max-w-lg mb-0 relative">
                        <button
                            className="absolute top-4 right-4 text-secondary hover:text-white"
                            onClick={() => setActiveQuickQuick(null)}
                        >
                            ✕
                        </button>

                        {activeQuickQuiz.loading ? (
                            <div className="text-center py-12">
                                <Sparkles size={32} className="text-primary pulse-animation mx-auto mb-4" />
                                <h3>Generating Quiz...</h3>
                                <p className="text-sm text-secondary">Creating questions for {activeQuickQuiz.topic}</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <span className="badge mb-2">Topic Quiz</span>
                                    <h4>{activeQuickQuiz.topic}</h4>
                                </div>

                                {activeQuickQuiz.questions.length > 0 && (
                                    <div className="quiz-body">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs text-secondary">Question {activeQuickQuiz.currentIdx + 1}/3</span>
                                        </div>

                                        <div className="mock-question glass-panel p-4 mb-6">
                                            <p className="text-sm font-semibold mb-4">{activeQuickQuiz.questions[activeQuickQuiz.currentIdx].text}</p>
                                            <div className="options-stack gap-2">
                                                {activeQuickQuiz.questions[activeQuickQuiz.currentIdx].options.map((opt, i) => (
                                                    <label key={i} className={`radio-card option-card p-3 text-sm ${activeQuickQuiz.answers[activeQuickQuiz.currentIdx] === i ? 'selected' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            className="hidden-radio"
                                                            checked={activeQuickQuiz.answers[activeQuickQuiz.currentIdx] === i}
                                                            onChange={() => setActiveQuickQuick(prev => ({
                                                                ...prev,
                                                                answers: { ...prev.answers, [prev.currentIdx]: i }
                                                            }))}
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-between mt-4">
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => setActiveQuickQuick(null)}
                                            >
                                                Close
                                            </button>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                disabled={activeQuickQuiz.answers[activeQuickQuiz.currentIdx] === undefined}
                                                onClick={() => {
                                                    if (activeQuickQuiz.currentIdx < 2) {
                                                        setActiveQuickQuick(prev => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
                                                    } else {
                                                        // Score and finish
                                                        let correct = 0;
                                                        activeQuickQuiz.questions.forEach((q, idx) => {
                                                            if (activeQuickQuiz.answers[idx] === q.answerIndex) correct++;
                                                        });
                                                        alert(`Quiz Complete! You got ${correct}/3 correct.`);
                                                        setActiveQuickQuick(null);
                                                    }
                                                }}
                                            >
                                                {activeQuickQuiz.currentIdx === 2 ? 'Finish' : 'Next'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// Just importing an icon not auto-imported
function BrainCircuit(props) {
    return <Sparkles {...props} />; // fallback if icon missing
}
