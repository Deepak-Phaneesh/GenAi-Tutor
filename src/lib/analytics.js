import { supabase } from './supabaseClient';

const CATEGORY_COLORS = {
    'Machine Learning': '#6366f1', // blue
    'AI': '#10b981',               // green
    'Web Development': '#f97316',  // orange
    'Web Dev': '#f97316',          // orange fallback
    'Languages': '#a855f7',        // purple
    'Language': '#a855f7',         // purple fallback
    'GenAI Tools': '#ec4899',      // pink/alternate
    'Python': '#eab308'            // yellow
};

const DEFAULT_COLOR = '#8b5cf6'; // default purple

export const fetchLearningSessions = async (userId) => {
    if (!userId) return [];

    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('category, topic, hours_spent')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching learning sessions:', error);
            return [];
        }

        // Group by category
        const groupedData = data.reduce((acc, curr) => {
            if (!acc[curr.category]) {
                acc[curr.category] = { hours: 0, topics: new Set() };
            }
            acc[curr.category].hours += curr.hours_spent;
            if (curr.topic) {
                acc[curr.category].topics.add(curr.topic);
            }
            return acc;
        }, {});

        // Format for Recharts
        const chartData = Object.keys(groupedData).map(category => ({
            name: category,
            value: groupedData[category].hours,
            color: CATEGORY_COLORS[category] || DEFAULT_COLOR,
            timeSpent: `${groupedData[category].hours} hours`,
            topics: Array.from(groupedData[category].topics)
        }));

        return chartData;
    } catch (e) {
        console.error('Exception fetching learning sessions:', e);
        return [];
    }
};

export const saveLearningSession = async (userId, category, topic, hours_spent) => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .insert([{
                user_id: userId,
                category,
                topic,
                hours_spent
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving learning session:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Exception saving learning session:', e);
        return null;
    }
};

export const fetchAssessmentResults = async (userId, topicFilter = 'All Topics') => {
    if (!userId) return [];

    try {
        let query = supabase
            .from('assessment_results')
            .select('skill, score')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (topicFilter && topicFilter !== 'All Topics') {
            query = query.eq('skill', topicFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching assessment results:', error);
            return [];
        }

        // Return structured data for Recharts, indexing chronologically
        return data.map((item, index) => ({
            week: `Assessment ${index + 1}`,
            score: item.score,
            topic: item.skill // map skill to charting topic conceptually
        }));
    } catch (e) {
        console.error('Exception fetching assessment results:', e);
        return [];
    }
};

export const fetchAssessmentsTaken = async (userId) => {
    if (!userId) return [];

    try {
        const { data, error } = await supabase
            .from('assessment_results')
            .select('domain, skill, score, level')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5); // Only get the last 5 for the dashboard widget

        if (error) {
            console.error('Error fetching recent assessments:', error);
            return [];
        }

        return data;
    } catch (e) {
        console.error('Exception fetching recent assessments:', e);
        return [];
    }
};

export const saveAssessmentResult = async (userId, domain, skill, level, score, total_questions) => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('assessment_results')
            .insert([{
                user_id: userId,
                domain,
                skill,
                level,
                score,
                total_questions
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving assessment result:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Exception saving assessment:', e);
        return null;
    }
};

export const fetchActiveLearningPath = async (userId) => {
    if (!userId) return null;

    try {
        const { data: pathArray, error } = await supabase
            .from('learning_paths')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching active learning path:', error);
            return null;
        }

        if (!pathArray || pathArray.length === 0) {
            return null;
        }

        const data = pathArray[0];

        const { count, error: countError } = await supabase
            .from('learning_path_assessments')
            .select('week_number', { count: 'exact', head: true })
            .eq('learning_path_id', data.id);

        let progress = 0;
        if (!countError && data.weeks > 0) {
            progress = Math.round(((count || 0) / data.weeks) * 100);
            if (progress > 100) progress = 100;
        }

        return {
            ...data,
            progress
        };
    } catch (e) {
        console.error('Exception fetching active learning path:', e);
        return null;
    }
};

export const fetchActiveLearningPaths = async (userId) => {
    if (!userId) return [];

    try {
        const { data: paths, error: pathsError } = await supabase
            .from('learning_paths')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (pathsError) {
            console.error('Error fetching active learning paths:', pathsError);
            return [];
        }

        const pathsWithProgress = await Promise.all(paths.map(async (path) => {
            const { count, error: countError } = await supabase
                .from('learning_path_assessments')
                .select('week_number', { count: 'exact', head: true })
                .eq('learning_path_id', path.id);

            let progress = 0;
            if (!countError && path.weeks > 0) {
                // If the user has completed more weeks than the total weeks, peg it at 100
                progress = Math.round(((count || 0) / path.weeks) * 100);
                if (progress > 100) progress = 100;
            }

            return {
                ...path,
                progress
            };
        }));

        return pathsWithProgress;
    } catch (e) {
        console.error('Exception fetching active learning paths:', e);
        return [];
    }
};

export const saveLearningPath = async (userId, pathData) => {
    if (!userId) return null;

    try {
        const payload = {
            user_id: userId,
            domain: pathData.domain,
            skill: pathData.skill,
            level: pathData.level,
            weeks: parseInt(pathData.weeks, 10),
            status: 'active',
            path_data: pathData.data || pathData.path_data
        };

        let result;
        if (pathData.id) {
            // Update existing
            const { data, error } = await supabase
                .from('learning_paths')
                .update(payload)
                .eq('id', pathData.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('learning_paths')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return result;
    } catch (e) {
        console.error('Exception saving learning path:', e);
        return null;
    }
};

export const fetchLearningPathTopics = async (userId) => {
    if (!userId) return [];
    try {
        const { data, error } = await supabase
            .from('learning_path_assessments')
            .select('topic')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching learning path topics:', error);
            return [];
        }

        // Extract distinct topics
        const topics = [...new Set(data.map(item => item.topic))];
        return topics;
    } catch (e) {
        console.error('Exception fetching learning path topics:', e);
        return [];
    }
};

export const fetchLearningPathAssessments = async (userId) => {
    if (!userId) return [];
    try {
        const { data, error } = await supabase
            .from('learning_path_assessments')
            .select('week_number, topic, score')
            .eq('user_id', userId)
            .order('week_number', { ascending: true });

        if (error) {
            console.error('Error fetching learning path assessments:', error);
            return [];
        }

        // Transform the data for Recharts grouping by week_number
        // We want: [{ week: "Week 1", "Python Basics": 65, "Machine Learning": 72 }, ...]
        const weeklyData = {};

        data.forEach(item => {
            const weekLabel = `Week ${item.week_number}`;
            if (!weeklyData[weekLabel]) {
                weeklyData[weekLabel] = { week: weekLabel, rawWeekNum: item.week_number };
            }
            weeklyData[weekLabel][item.topic] = item.score;
        });

        return Object.values(weeklyData).sort((a, b) => a.rawWeekNum - b.rawWeekNum);
    } catch (e) {
        console.error('Exception fetching learning path assessments:', e);
        return [];
    }
};

export const saveLearningPathAssessment = async (userId, learningPathId, weekNumber, topic, score) => {
    if (!userId) return null;
    try {
        const { data, error } = await supabase
            .from('learning_path_assessments')
            .insert([{
                user_id: userId,
                learning_path_id: learningPathId || null,
                week_number: weekNumber,
                topic,
                score
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving learning path assessment:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Exception saving learning path assessment:', e);
        return null;
    }
};

export const saveWeeklyAssessmentResult = async (userId, pathId, weekNumber, topic, weeklyTopics, score, totalQuestions) => {
    if (!userId) return null;
    try {
        const { data, error } = await supabase
            .from('weekly_assessment_results')
            .insert([{
                user_id: userId,
                learning_path_id: pathId || null,
                week_number: weekNumber,
                topic,
                weekly_topics: weeklyTopics,
                score,
                total_questions: totalQuestions
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving weekly assessment result:', error);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Exception saving weekly assessment result:', e);
        return null;
    }
};
export const saveStructuredLearningPath = async (userId, pathId, weeksData) => {
    if (!userId || !pathId || !weeksData) return false;

    try {
        for (const week of weeksData) {
            const { data: weekRecord, error: weekError } = await supabase
                .from('learning_path_weeks')
                .insert([{
                    learning_path_id: pathId,
                    week_number: week.weekNumber,
                    title: week.title || `Week ${week.weekNumber}`
                }])
                .select()
                .single();

            if (weekError) throw weekError;

            const daysToInsert = week.days.map(day => ({
                week_id: weekRecord.id,
                day_number: day.dayNumber || day.day,
                topic: day.topic,
                explanation: day.content || day.explanation || '',
                practice_exercise: day.practice_suggestion || day.practice_exercise || '',
                duration: day.duration || ''
            }));

            const { error: daysError } = await supabase
                .from('learning_path_days')
                .insert(daysToInsert);

            if (daysError) throw daysError;
        }
        return true;
    } catch (e) {
        console.error('Exception saving structured learning path:', e);
        return false;
    }
};

export const fetchStructuredLearningPath = async (pathId) => {
    if (!pathId) return null;

    try {
        const { data: weeks, error: weeksError } = await supabase
            .from('learning_path_weeks')
            .select(`
                *,
                learning_path_days(*)
            `)
            .eq('learning_path_id', pathId)
            .order('week_number', { ascending: true });

        if (weeksError) throw weeksError;

        return weeks.map(week => ({
            ...week,
            days: week.learning_path_days.sort((a, b) => a.day_number - b.day_number)
        }));
    } catch (e) {
        console.error('Exception fetching structured learning path:', e);
        return null;
    }
};

export const saveWeeklyAssessment = async (pathId, weekNumber, questions) => {
    if (!pathId || !weekNumber || !questions) return null;

    try {
        const { data, error } = await supabase
            .from('weekly_assessments')
            .insert([{
                learning_path_id: pathId,
                week_number: weekNumber,
                questions: questions
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('Exception saving weekly assessment:', e);
        return null;
    }
};

export const updateStructuredWeek = async (pathId, weekNumber, updatedWeekData) => {
    if (!pathId || !weekNumber || !updatedWeekData) return false;

    try {
        // 1. Find the week record
        const { data: weekRecord, error: weekError } = await supabase
            .from('learning_path_weeks')
            .select('id')
            .eq('learning_path_id', pathId)
            .eq('week_number', weekNumber)
            .single();

        if (weekError) throw weekError;

        // 2. Delete existing days for this week
        const { error: deleteError } = await supabase
            .from('learning_path_days')
            .delete()
            .eq('week_id', weekRecord.id);

        if (deleteError) throw deleteError;

        // 3. Insert new days
        const daysToInsert = updatedWeekData.days.map(day => ({
            week_id: weekRecord.id,
            day_number: day.dayNumber || day.day,
            topic: day.topic,
            explanation: day.content || day.explanation || day.assessment_topics || '',
            practice_exercise: day.practice_suggestion || day.practice_exercise || '',
            duration: day.duration || ''
        }));

        const { error: insertError } = await supabase
            .from('learning_path_days')
            .insert(daysToInsert);

        if (insertError) throw insertError;

        return true;
    } catch (e) {
        console.error('Exception updating structured week:', e);
        return false;
    }
};
