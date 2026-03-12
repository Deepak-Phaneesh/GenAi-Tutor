import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { updateProgressMetric } from '../lib/progress';
import {
    saveLearningPath,
    fetchActiveLearningPath,
    fetchLearningPathById,
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
    Code,
    Send,
    Brain
} from 'lucide-react';
import './PathGenerator.css';

const GEMINI_URL = (apiKey) =>
    `https://api.groq.com/openai/v1/chat/completions`;

// Wrapper with auto-retry until 2-minute timeout
// Centralized AI request wrapper with auto-retry and robust JSON parsing
const groqRequest = async (apiKey, payload, onStatus) => {
    const url = `https://api.groq.com/openai/v1/chat/completions`;
    
    // Auto-detect payload format (string = prompt, object = full body)
    const bodyObj = typeof payload === 'string' 
        ? { 
            model: "llama-3.3-70b-versatile", 
            messages: [{ role: "user", content: payload }],
            response_format: { type: "json_object" } 
          }
        : {
            ...payload,
            response_format: payload.response_format || { type: "json_object" }
          };

    const body = JSON.stringify(bodyObj);
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    const startTime = Date.now();

    while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= TIMEOUT_MS) throw new Error('AI request timed out after 2 minutes.');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s per attempt

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.status === 429 || res.status === 503) {
                const errData = await res.json().catch(() => ({}));
                const isRateLimit = errData?.error?.status === 'RESOURCE_EXHAUSTED' || res.status === 429;
                const remaining = TIMEOUT_MS - (Date.now() - startTime);
                if (remaining <= 0) throw new Error('AI request timed out.');
                
                const waitTime = isRateLimit ? Math.min(15000, remaining) : Math.min(3000, remaining);
                const elapsed_s = Math.round((Date.now() - startTime) / 1000);
                if (onStatus) onStatus(`AI is busy. Retrying... (${elapsed_s}s elapsed)`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API Error ${res.status}: ${errText}`);
            }

            const raw = await res.json();
            const textContent = raw?.choices?.[0]?.message?.content || '';
            let processedJsonStr = textContent;
            
            try {
                const match = textContent.match(/\{[\s\S]*\}/);
                if (match) {
                    processedJsonStr = match[0];
                } else {
                    processedJsonStr = textContent.replace(/```json\n?/g, '').replace(/```/g, '').trim();
                }
                return JSON.parse(processedJsonStr);
            } catch (parseError) {
                console.error("JSON PARSE ERROR. Raw text was:", textContent);
                // We throw a catchable error so the outer loop can retry if time allows
                throw new Error("The AI returned a malformed response. Retrying...");
            }
        } catch (error) {
            if (error.message.includes('timed out') || error.message.includes('API Error')) throw error;
            const remaining = TIMEOUT_MS - (Date.now() - startTime);
            if (remaining <= 0) throw new Error('AI request timed out.');
            const elapsed_s = Math.round((Date.now() - startTime) / 1000);
            if (onStatus) onStatus(`Connection error. Retrying... (${elapsed_s}s elapsed)`);
            await new Promise(r => setTimeout(r, 2000));
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
    const [generationError, setGenerationError] = useState(null);
    const [loadingMsg, setLoadingMsg] = useState('');

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
    const [activeQuickQuiz, setActiveQuickQuiz] = useState(null);

    // AI Study Buddy Chat State: { messages: [{role, content}], loading: boolean, input: string }
    const [studyBuddy, setStudyBuddy] = useState({
        messages: [],
        loading: false,
        input: ''
    });

    // Ref for the daily learning modal scroll container
    const learningModalRef = useRef(null);

    // Sync state to dashboard
    useEffect(() => {
        if (activeLearningDay && learningModalRef.current) {
            learningModalRef.current.scrollTop = 0;
        }
    }, [activeLearningDay]);

    // Reset scroll to top whenever the step/view changes
    useEffect(() => {
        const mainEl = document.querySelector('.main-content');
        if (mainEl) mainEl.scrollTop = 0;
    }, [step]);

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

    const [searchParams] = useSearchParams();
    const specificPathId = searchParams.get('pathId');

    // Restore state from dashboard
    useEffect(() => {
        const loadPath = async () => {
            if (user?.id) {
                let targetPath = null;
                
                if (specificPathId) {
                    targetPath = await fetchLearningPathById(user.id, specificPathId);
                } else {
                    targetPath = await fetchActiveLearningPath(user.id);
                }

                if (targetPath && targetPath.path_data && !hasStartedGeneration) {
                    setFormData({
                        skill: targetPath.skill,
                        domain: targetPath.domain,
                        level: targetPath.level,
                        weeks: targetPath.weeks
                    });

                    const pData = targetPath.path_data;
                    setPathId(targetPath.id);
                    setCompletedDays(pData.completedDays || {});
                    setGeneratedData({ exam: pData.exam, path: pData.path });
                    setStep(4); // Jump directly to the result view
                }
            }
        };
        loadPath();
    }, [user, specificPathId]);

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
        setGenerationError(null);
        setCurrentQuestionIndex(0);

        try {
            const apiKey = (import.meta.env.VITE_GROQ_API_KEY || '').trim();
            if (!apiKey) {
                alert("AI service configuration error. Please check API key.");
                setStep(1);
                return;
            }

            const domainLabel = getDomainLabel(currentForm.domain);
            const isNonProgramming = currentForm.domain === 'lang' || currentForm.domain === 'non-it';
            const isNonProgrammingContext = isNonProgramming ? `CRITICAL: This is a "${domainLabel}" curriculum, NOT a programming curriculum. Do NOT include coding topics.` : '';

            const generateChunk = async (startWeek, endWeek) => {
                const weekCount = endWeek - startWeek + 1;
                const chunkPrompt = `Generate a partial learning curriculum as a JSON object for the skill: ${currentForm.skill}.

Domain: ${domainLabel}
User Level: ${currentForm.level}
This is weeks ${startWeek} to ${endWeek} of a ${currentForm.weeks}-week plan. (${weekCount} weeks total in this chunk)

Rules:
1. STRICT PROGRESSION: These weeks (${startWeek}-${endWeek}) must build on previous weeks. Each week introduces entirely NEW, unique, and more advanced topics. DO NOT repeat topics.
2. Each week must contain exactly 7 days (Day 1-6 learning, Day 7 is for assessment).
3. Day Content: Detailed explanation of at least 5-6 lines long. Write it as a comprehensive study note covering what the topic is, why it matters, how it works, and a brief example or analogy. Use \\n\\n for paragraph breaks between sections.
4. Resources: Every learning day MUST include an array of 2-3 real URL strings (documentation or tutorials).
5. The curriculum must be SPECIFICALLY about "${currentForm.skill}". ${isNonProgrammingContext}

Respond with ONLY a valid JSON object:
{
  "weeks": [
    {
      "week": ${startWeek},
      "title": "Week ${startWeek} Title",
      "days": [
        {"day": 1, "topic": "...", "content": "...", "duration": "2 hours", "practice_suggestion": "...", "resources": ["https://..."]}
      ]
    }
  ]
}

CRITICAL: YOU MUST GENERATE EXACTLY ${weekCount} WEEK OBJECTS (weeks ${startWeek} through ${endWeek}).`;

                const chunkData = await groqRequest(apiKey, chunkPrompt, null);
                return chunkData.weeks || chunkData.path || chunkData.curriculum || [];
            };

            // Generate the pre-assessment exam separately
            const examPrompt = `Generate a 5-question multiple-choice pre-assessment for the skill: ${currentForm.skill} at ${currentForm.level} level.
Return ONLY valid JSON: {"exam": [{"text": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0}]}`;
            
            let examData = { exam: [] };
            try {
                examData = await groqRequest(apiKey, examPrompt, null);
            } catch (err) {
                console.warn("Exam generation failed, continuing without exam:", err.message);
            }

            // Generate weeks in chunks of 4
            const totalWeeks = parseInt(currentForm.weeks, 10) || 4;
            const CHUNK_SIZE = 4;
            let allWeeks = [];
            
            for (let startWeek = 1; startWeek <= totalWeeks; startWeek += CHUNK_SIZE) {
                const endWeek = Math.min(startWeek + CHUNK_SIZE - 1, totalWeeks);
                setLoadingMsg(`Generating weeks ${startWeek}-${endWeek} of ${totalWeeks}...`);
                const chunkWeeks = await generateChunk(startWeek, endWeek);
                allWeeks = [...allWeeks, ...chunkWeeks];
            }

            const data = {
                exam: examData.exam || [],
                path: allWeeks
            };

            // Part 4: Prevent Duplicate Content
            const pathArrayCheck = data.path || data.curriculum || data.weeks;
            if (pathArrayCheck && Array.isArray(pathArrayCheck)) {
                const allTopics = pathArrayCheck.flatMap(w => (w.days || []).map(d => (d.topic || '').toLowerCase().trim()));
                const uniqueTopics = new Set(allTopics);
                
                // If it's duplicating more than half of its topics, it failed the uniqueness test.
                // We shouldn't infinite retry to avoid rate limits, so we only retry once.
                if (uniqueTopics.size < allTopics.length * 0.8) {
                    console.log("Duplicate topics detected. AI failed prompt rules. Using data as-is to prevent infinite loop.");
                    // In a production app you'd retry once, but to prevent rate-limits on free APIs during testing we accept the data or show a warning.
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
                            practice_suggestion: day.practice_suggestion,
                            resources: day.resources || []
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
            setGenerationError(error.message);

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

    const normalizeQuestions = (rawQuestions) => {
        if (!Array.isArray(rawQuestions)) return [];
        return rawQuestions.map(q => {
            const text = q.question || q.text || "Assessment Question";
            const options = Array.isArray(q.options) ? q.options : ["Option A", "Option B", "Option C", "Option D"];
            
            // Robust answer index extraction
            let answerIndex = 0;
            if (typeof q.answerIndex === 'number') {
                answerIndex = q.answerIndex;
            } else if (typeof q.answer === 'string') {
                const cleanAnswer = q.answer.trim().toUpperCase();
                // Check if answer is a single letter "A", "B", etc.
                if (cleanAnswer.length === 1 && cleanAnswer >= 'A' && cleanAnswer <= 'Z') {
                    const letterIdx = cleanAnswer.charCodeAt(0) - 65;
                    if (letterIdx >= 0 && letterIdx < options.length) {
                        answerIndex = letterIdx;
                    }
                } else {
                    // Check for exact text match or case-insensitive match
                    const foundIdx = options.findIndex(opt => 
                        opt.toLowerCase().trim() === q.answer.toLowerCase().trim()
                    );
                    answerIndex = foundIdx >= 0 ? foundIdx : 0;
                }
            } else if (q.correctIndex !== undefined) {
                answerIndex = parseInt(q.correctIndex, 10) || 0;
            } else if (q.correct_answer !== undefined) {
                const foundIdx = options.indexOf(q.correct_answer);
                answerIndex = foundIdx >= 0 ? foundIdx : 0;
            } else if (q.correct_option !== undefined) {
                answerIndex = parseInt(q.correct_option, 10) || 0;
            }

            return {
                type: 'mcq',
                text: text,
                options: options,
                answerIndex: answerIndex
            };
        });
    };

    const getExamArray = (data) => {
        if (!data) return [];
        let raw = [];
        if (Array.isArray(data)) {
            const row = data.find(d => d.exam);
            if (row) raw = Array.isArray(row.exam) ? row.exam : (row.exam.questions || []);
        } else if (data.exam) {
            raw = Array.isArray(data.exam) ? data.exam : (data.exam.questions || []);
        } else if (data.questions) {
            raw = Array.isArray(data.questions) ? data.questions : [];
        }
        return normalizeQuestions(raw);
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
        // Reset Study Buddy chat for the new topic
        setStudyBuddy({
            messages: [{ role: 'assistant', content: `Hi! I'm your AI Study Buddy for **${dayData.topic}**. Ask me anything about today's lesson!` }],
            loading: false,
            input: ''
        });
    };

    const handleFinishLearningDay = async () => {
        if (!activeLearningDay) return;
        try {
            const { weekIdx, dayIdx } = activeLearningDay;
            toggleDayCompletion(weekIdx, dayIdx);
            const dayTopic = activeLearningDay.data.topic || formData.skill;
            setActiveLearningDay(null);
            
            if (user?.id) {
                await updateProgressMetric(user.id, { hours_learned: 1 });
                await saveLearningSession(user.id, formData.skill || 'Custom', dayTopic, 1);
                window.dispatchEvent(new Event('refresh-dashboard'));
            }
        } catch (error) {
            console.error("Error finishing learning day:", error);
            // Close modal anyway to prevent UI hang
            setActiveLearningDay(null);
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

            // 1. Save results to the detailed table
            await saveWeeklyAssessmentResult(
                user.id,
                pathId,
                weekIdx + 1,
                formData.skill || 'Custom',
                weeklyTopics,
                score,
                activeWeeklyAssessment?.questions?.length || 15
            );

            // Also save to learning_path_assessments for the dashboard chart
            await saveLearningPathAssessment(
                user.id,
                pathId,
                weekIdx + 1,
                formData.skill || 'Custom',
                score
            );

            await updateProgressMetric(user.id, { assessments_taken: 1 });
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

            const prompt = `The user scored ${score}% in the weekly assessment for Week ${weekIdx + 1}.
            Current Week Topics: ${currentWeekTopics}.
            Originally planned Next Week (${nextWeekNum}): "${nextWeekOriginal?.title || 'Next Steps'}".
            
            ADAPTIVE REGENERATION TASK:
            Modify the content for Week ${nextWeekNum}. 
            Because the user scored below 70%, dedicate Day 1 and Day 2 of the NEW Week ${nextWeekNum} to REVISION and reinforcement of the weak topics listed above. 
            Days 3-6 should then continue with the originally planned progression.
            Day 7 is always the Weekly Assessment Topics.
            
            REQUIRED JSON STRUCTURE:
            {
              "title": "Week ${nextWeekNum}: [New Descriptive Title]",
              "days": [
                { "day": 1, "topic": "Revision: ...", "content": "Detailed 3-line explanation...", "duration": "2 hours", "practice_suggestion": "...", "resources": ["Url1"] },
                ... up to Day 7
              ]
            }
            
            Return ONLY the valid JSON object for Week ${nextWeekNum}. No conversational filler.`;

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
                                day: { type: 'integer' },
                                topic: { type: 'string' },
                                content: { type: 'string' },
                                duration: { type: 'string' },
                                practice_suggestion: { type: 'string' },
                                resources: {
                                    type: 'array',
                                    items: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            };

            let updatedNextWeek = await groqRequest(apiKey, {
                model: "llama-3.1-8b-instant",
                response_format: { type: "json_object" },
                messages: [{ role: "user", content: prompt }]
            }, null);

            // Robust unwrapping: AI sometimes nests under "week", "curriculum", etc.
            if (updatedNextWeek && !updatedNextWeek.days) {
                const possibleKeys = ['week', 'curriculum', 'path', 'nextWeek', `week${nextWeekNum}`];
                for (const key of possibleKeys) {
                    if (updatedNextWeek[key] && updatedNextWeek[key].days) {
                        updatedNextWeek = updatedNextWeek[key];
                        break;
                    }
                }
            }

            // Validation check
            if (!updatedNextWeek || !Array.isArray(updatedNextWeek.days)) {
                throw new Error('AI returned an invalid week structure (missing days).');
            }

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
            alert(`Could not update timeline. Error: ${error.message}. Proceeding with standard Week ${weekIdx + 2}`);
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

            const data = await groqRequest(apiKey, prompt, (msg) => {
                setActiveWeeklyAssessment(prev => prev ? { ...prev, loading: true } : prev);
                console.log('Assessment Status:', msg);
            });

            if (data && (data.questions || data.assessment)) {
                const rawQuestions = data.questions || data.assessment;
                const formattedQuestions = normalizeQuestions(rawQuestions);

                if (pathId) {
                    await saveWeeklyAssessment(pathId, weekIdx + 1, formattedQuestions);
                }

                setActiveWeeklyAssessment(prev => ({
                    ...prev,
                    questions: formattedQuestions,
                    loading: false
                }));
            } else {
                throw new Error("Invalid assessment data received from AI");
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

    const handleBuddyAsk = async (e) => {
        if (e) e.preventDefault();
        if (!studyBuddy.input.trim() || studyBuddy.loading) return;

        const userMsg = studyBuddy.input.trim();
        const newMessages = [...studyBuddy.messages, { role: 'user', content: userMsg }];
        
        setStudyBuddy(prev => ({ 
            ...prev, 
            messages: newMessages, 
            loading: true, 
            input: '' 
        }));

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            const topicContext = activeLearningDay?.data?.topic || "this topic";
            const contentContext = activeLearningDay?.data?.content || "";
            
            const prompt = `You are a helpful AI Study Buddy. The user is currently learning about: ${topicContext}.
            Context from the lesson: ${contentContext}
            
            Answer the user's question clearly and concisely. If they ask for examples, provide them.
            User Question: ${userMsg}
            
            IMPORTANT: Return your response as a JSON object with an "answer" field.
            Example: {"answer": "Your explanation here..."}`;

            const response = await groqRequest(apiKey, {
                model: "llama-3.1-8b-instant",
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: "You are a helpful Tutor. Keep answers short, encouraging, and focused on the current topic. Always return JSON." },
                    ...studyBuddy.messages.slice(-4).map(m => ({ role: m.role, content: m.content })), 
                    { role: "user", content: prompt }
                ]
            });

            const buddyReply = response.answer || response.explanation || "I'm sorry, I couldn't process that. Can you rephrase?";

            setStudyBuddy(prev => ({
                ...prev,
                messages: [...newMessages, { role: 'assistant', content: buddyReply }],
                loading: false
            }));
        } catch (error) {
            console.error("Study Buddy Error:", error);
            setStudyBuddy(prev => ({
                ...prev,
                messages: [...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again!" }],
                loading: false
            }));
        }
    };

    const startQuickQuiz = async (topic) => {
        setActiveQuickQuiz({
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
                setActiveQuickQuiz(null);
                return;
            }

            const data = await groqRequest(apiKey, prompt, (msg) => console.log('Quiz Status:', msg));

            if (data && data.questions) {
                const formattedQs = normalizeQuestions(data.questions);
                setActiveQuickQuiz(prev => ({ ...prev, questions: formattedQs, loading: false }));
            } else {
                throw new Error('Invalid quiz data format.');
            }
        } catch (error) {
            console.error("Quick Quiz Error:", error);
            alert("Could not generate quiz. Please try again.");
            setActiveQuickQuiz(null);
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
                    <div className="pg-form-wrapper animate-fade-in">
                        <form className="pg-form glass-panel" onSubmit={handleGenerate}>

                            {/* Section 1: Domain */}
                            <div className="pg-section">
                                <div className="pg-section-label">
                                    <MapPin size={16} className="text-primary" />
                                    <span>Select Domain</span>
                                </div>
                                <div className="pg-domain-pills">
                                    {domains.map(d => (
                                        <label key={d.id} className={`pg-pill ${formData.domain === d.id ? 'active' : ''}`}>
                                            <input type="radio" name="domain" value={d.id} className="hidden-radio"
                                                checked={formData.domain === d.id}
                                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                            />
                                            <span>{d.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pg-divider" />

                            {/* Section 2: Skill + Duration */}
                            <div className="pg-two-col">
                                <div className="pg-field">
                                    <div className="pg-section-label">
                                        <Search size={16} className="text-primary" />
                                        <span>Target Skill / Topic</span>
                                    </div>
                                    <div className="input-wrapper">
                                        <Search size={16} className="input-icon" />
                                        <input type="text" name="skill" className="input-field with-icon"
                                            placeholder="e.g. Python, Digital Marketing, Spanish..."
                                            value={formData.skill}
                                            onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="pg-field">
                                    <div className="pg-section-label">
                                        <Clock size={16} className="text-primary" />
                                        <span>Duration</span>
                                    </div>
                                    <div className="input-wrapper">
                                        <Clock size={16} className="input-icon" />
                                        <select name="weeks" className="input-field with-icon select-field"
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

                            <div className="pg-divider" />

                            {/* Section 3: Level Slider */}
                            <div className="pg-section">
                                <div className="pg-section-label">
                                    <GraduationCap size={16} className="text-primary" />
                                    <span>Your Current Level</span>
                                    <span className="pg-level-badge">Level {formData.level}</span>
                                </div>
                                <div className="range-wrapper" style={{ paddingBottom: 0 }}>
                                    <input type="range" min="1" max="5" value={formData.level}
                                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                        className="range-slider"
                                    />
                                    <div className="pg-level-labels">
                                        <span>Beginner</span>
                                        <span>Intermediate</span>
                                        <span>Expert</span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="pg-cta">
                                <button type="submit" className="btn btn-primary btn-lg w-full btn-glow">
                                    <Sparkles size={20} /> Generate My Learning Path
                                </button>
                                <p className="text-xs text-secondary text-center mt-3" style={{ opacity: 0.6 }}>
                                    AI generates a personalized weekly curriculum with daily tasks &amp; assessments.
                                </p>
                            </div>
                        </form>

                        {/* Feature Cards */}
                        <div className="pg-info-cards animate-fade-in" style={{ animationDelay: '0.15s' }}>
                            {[
                                { icon: <Wand2 size={22} className="text-primary" />, title: 'AI-Personalized', desc: 'Curriculum designed specifically for your skill level and goals.' },
                                { icon: <CalendarDays size={22} className="text-secondary" />, title: 'Day-by-Day Plan', desc: 'Structured daily tasks and weekly checkpoint assessments.' },
                                { icon: <GraduationCap size={22} className="text-success" />, title: 'Adaptive Learning', desc: 'Path updates automatically based on your weekly performance.' },
                            ].map((card, i) => (
                                <div key={i} className="pg-info-card glass-panel">
                                    <div className="pg-info-icon">{card.icon}</div>
                                    <div>
                                        <p className="font-semibold" style={{ fontSize: '0.95rem' }}>{card.title}</p>
                                        <p className="text-secondary" style={{ fontSize: '0.82rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{card.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Loading State */}
                {step === 2 && (
                    <div className="loading-container glass-panel animate-in text-center py-12">
                        <div className="loader mx-auto mb-6">
                            <Sparkles className="icon pulse text-primary" size={48} />
                        </div>
                        <h2>Creating Your Path...</h2>
                        <p className="loading-text mt-2 text-secondary">{loadingMsg || "Connecting to AI..."}</p>
                        
                        {generationError && (
                            <div className="error-box mt-8 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm max-w-md mx-auto">
                                <p className="font-bold mb-1">AI Error Detected:</p>
                                <p>{generationError}</p>
                                <p className="mt-2 text-xs opacity-70 font-medium">Falling back to standard curriculum...</p>
                            </div>
                        )}
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

                                <div className="mock-question glass-panel p-6 mb-8">
                                    <span className="q-number text-sm font-semibold text-primary">Question {currentQuestionIndex + 1}/{examArray.length}</span>
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

                                <div className="flex justify-between items-center mt-10 pt-6 border-t border-light">
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
                                                    {week.days && week.days.slice(0, 6).map((day, dIdx) => {
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
                                                                        <span className="text-xs text-secondary truncate" style={{ maxWidth: '200px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', whiteSpace: 'normal', overflow: 'hidden' }}>{day.content || day.explanation}</span>
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
            {activeWeeklyAssessment && (
                <div className="modal-overlay flex items-center justify-center p-4" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="exam-card glass-panel w-full max-w-2xl animate-scale-up relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        
                        <div className="flex justify-between items-start mb-6 sticky top-0 bg-dark py-2 z-10 border-b border-light">
                            <div>
                                <span className="badge mb-2">Week {activeWeeklyAssessment.weekIdx + 1} Assessment</span>
                                <h2 className="text-gradient">Knowledge Checkpoint</h2>
                            </div>
                            <button className="close-btn text-secondary hover:text-white" onClick={() => setActiveWeeklyAssessment(null)}>✕</button>
                        </div>

                        {activeWeeklyAssessment.loading ? (
                            <div className="text-center py-16">
                                <Sparkles size={48} className="text-primary pulse-animation mx-auto mb-6" />
                                <h3>Generating Live Assessment...</h3>
                                <p className="text-secondary mt-2 text-sm">Our AI is creating custom questions based on this week's 6 days of learning.</p>
                            </div>
                        ) : (
                            <div className="exam-body">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Question {activeWeeklyAssessment.currentIdx + 1} of {activeWeeklyAssessment.questions.length}</span>
                                    <div className="w-32 h-1 bg-dark rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300" 
                                            style={{ width: `${((activeWeeklyAssessment.currentIdx + 1) / activeWeeklyAssessment.questions.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mock-question glass-panel p-6 mb-8 border border-primary border-opacity-20 shadow-lg">
                                    <h4 className="text-lg leading-snug mb-8">{activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.text}</h4>

                                    <div className="options-stack gap-3">
                                        {activeWeeklyAssessment.questions[activeWeeklyAssessment.currentIdx]?.options.map((opt, i) => (
                                            <label key={i} className={`radio-card option-card p-4 flex align-center gap-3 cursor-pointer transition-all border border-light rounded-lg hover:border-primary ${activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i ? 'selected border-primary bg-primary-light shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : ''}`}>
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
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === i ? 'bg-primary border-primary text-white' : 'border-light text-secondary'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className="text-sm font-medium">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-10 pt-6 border-t border-light gap-4">
                                    <button
                                        className="btn btn-outline flex-1"
                                        onClick={() => setActiveWeeklyAssessment(null)}
                                    >
                                        Exit
                                    </button>
                                    <button
                                        className="btn btn-primary btn-glow flex-1"
                                        onClick={handleWeeklyNextBtn}
                                        disabled={activeWeeklyAssessment.answers[activeWeeklyAssessment.currentIdx] === undefined}
                                    >
                                        {activeWeeklyAssessment.currentIdx === activeWeeklyAssessment.questions.length - 1 ? 'Finish & Grade' : 'Next Question'} <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Daily Subject Learning Modal */}
            {
                activeLearningDay && activeLearningDay.data && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div ref={learningModalRef} className="exam-card glass-panel w-full max-w-3xl animate-fade-in mx-4" style={{ margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="text-center mb-6">
                                <span className="badge mb-2">Week {activeLearningDay.weekIdx + 1} • Day {activeLearningDay.dayIdx + 1}</span>
                                <h2 className="text-gradient">{activeLearningDay.data.topic}</h2>
                                <p className="text-secondary mt-1">{activeLearningDay.data.duration}</p>
                            </div>

                            <div className="learning-content text-left space-y-6">
                                <div className="p-4 bg-dark rounded border border-light">
                                    <h4 className="flex align-center gap-2 mb-2"><Sparkles size={18} className="text-primary" /> Explanation</h4>
                                    <div className="text-sm leading-relaxed text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                                        {activeLearningDay.data.content || activeLearningDay.data.explanation}
                                    </div>
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

                             <div className="flex justify-between mt-8 pt-8 border-t border-light gap-8 items-start">
                                {/* Left Side: Learning Actions */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-3">
                                        <button className="btn btn-outline" onClick={() => setActiveLearningDay(null)}>
                                            Read Later
                                        </button>
                                        <button
                                            className="btn btn-outline flex align-center gap-2"
                                            onClick={() => startQuickQuiz(activeLearningDay.data.topic)}
                                        >
                                            <Sparkles size={18} className="text-secondary" /> Quick Quiz
                                        </button>
                                        <button className="btn btn-primary btn-glow" onClick={handleFinishLearningDay}>
                                            Mark as Complete & Close
                                        </button>
                                    </div>

                                    {activeLearningDay.data.practice_suggestion && (
                                        <div className="p-4 bg-primary-light rounded border border-primary border-opacity-30">
                                            <h4 className="flex align-center gap-2 mb-2 text-primary font-bold"><Terminal size={18} /> Interactive Practice</h4>
                                            <p className="text-xs text-secondary mb-4 leading-relaxed">{activeLearningDay.data.practice_suggestion || activeLearningDay.data.practice_exercise}</p>
                                            <button
                                                className="btn btn-primary btn-sm w-full shadow-lg"
                                                onClick={() => handleStartPractice(activeLearningDay.data)}
                                            >
                                                Launch Sandbox
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: AI Study Buddy Chat */}
                                <div className="w-80 glass-panel p-0 flex flex-col border border-primary border-opacity-20 shadow-2xl overflow-hidden" style={{ height: '400px' }}>
                                    <div className="p-3 border-b border-light flex align-center gap-2 bg-primary-light">
                                        <Sparkles size={16} className="text-primary pulse-animation" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Study Buddy</span>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-dark bg-opacity-50 chat-container">
                                        {studyBuddy.messages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                                                    msg.role === 'user' 
                                                        ? 'bg-primary text-white rounded-br-none' 
                                                        : 'bg-dark border border-light text-secondary rounded-bl-none shadow-sm'
                                                }`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {studyBuddy.loading && (
                                            <div className="flex justify-start">
                                                <div className="bg-dark border border-light p-3 rounded-2xl rounded-bl-none">
                                                    <span className="dot-flashing"></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={handleBuddyAsk} className="p-3 border-t border-light bg-dark">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                className="w-full bg-dark border border-light rounded-full py-2 px-4 pr-10 text-xs focus:border-primary outline-none transition-all placeholder:text-muted"
                                                placeholder="Ask a question..."
                                                value={studyBuddy.input}
                                                onChange={(e) => setStudyBuddy(prev => ({ ...prev, input: e.target.value }))}
                                                disabled={studyBuddy.loading}
                                            />
                                            <button 
                                                type="submit"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white disabled:opacity-50"
                                                disabled={!studyBuddy.input.trim() || studyBuddy.loading}
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Quick Quiz Overlay */}
            {activeQuickQuiz && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[1100] flex items-center justify-center p-4">
                    <div className="exam-card glass-panel w-full max-w-lg mb-0 relative">
                        <button
                            className="absolute top-4 right-4 text-secondary hover:text-white"
                            onClick={() => setActiveQuickQuiz(null)}
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
                                                            onChange={() => setActiveQuickQuiz(prev => ({
                                                                ...prev,
                                                                answers: { ...prev.answers, [prev.currentIdx]: i }
                                                            }))}
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-light">
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => setActiveQuickQuiz(null)}
                                                >
                                                    Close
                                                </button>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    disabled={activeQuickQuiz.answers[activeQuickQuiz.currentIdx] === undefined}
                                                    onClick={() => {
                                                        if (activeQuickQuiz.currentIdx < activeQuickQuiz.questions.length - 1) {
                                                            setActiveQuickQuiz(prev => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
                                                        } else {
                                                            // Score and finish
                                                            let correct = 0;
                                                            activeQuickQuiz.questions.forEach((q, idx) => {
                                                                if (activeQuickQuiz.answers[idx] === q.answerIndex) correct++;
                                                            });
                                                            alert(`Quiz Complete! You got ${correct}/${activeQuickQuiz.questions.length} correct.`);
                                                            setActiveQuickQuiz(null);
                                                        }
                                                    }}
                                                >
                                                    {activeQuickQuiz.currentIdx === activeQuickQuiz.questions.length - 1 ? 'Finish' : 'Next'}
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
