import { supabase } from './supabaseClient';

/**
 * Fetches the user's progress. If it doesn't exist, creates a default record.
 */
export const fetchUserProgress = async (userId) => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found, create default
                return createDefaultProgress(userId);
            }
            console.error("Error fetching user progress:", error);
            return null;
        }

        return data;
    } catch (e) {
        console.error("fetchUserProgress Exception:", e);
        return null;
    }
};

/**
 * Creates default progress record for a user.
 */
export const createDefaultProgress = async (userId) => {
    try {
        const defaultData = {
            user_id: userId,
            hours_learned: 0,
            assessments_taken: 0,
            learning_paths_created: 0,
            quizzes_taken: 0,
            avg_accuracy: 0,
            learning_streak: 0
        };

        const { data, error } = await supabase
            .from('user_progress')
            .insert([defaultData])
            .select()
            .single();

        if (error) {
            console.error("Error creating default progress:", error);
            return null;
        }
        return data;
    } catch (e) {
        console.error("createDefaultProgress Exception:", e);
        return null;
    }
};

/**
 * Increments a specific stat or updates an average.
 * @param {string} userId
 * @param {object} updates e.g. { hours_learned: 1 } (relative increment) or { quiz_score: 80 } (for accuracy calculation)
 */
export const updateProgressMetric = async (userId, updates) => {
    try {
        // 1. Get current progress
        const currentProgress = await fetchUserProgress(userId);
        if (!currentProgress) return null;

        const newValues = { ...currentProgress };

        // 2. Handle simple increments
        if (updates.hours_learned) newValues.hours_learned += updates.hours_learned;
        if (updates.assessments_taken) newValues.assessments_taken += updates.assessments_taken;
        if (updates.learning_paths_created) newValues.learning_paths_created += updates.learning_paths_created;

        // 3. Handle accuracy/quiz updates
        if (updates.quiz_score !== undefined) {
            const newTotalQuizzes = newValues.quizzes_taken + 1;
            const currentTotalScore = newValues.quizzes_taken * newValues.avg_accuracy;
            const newAvgAccuracy = Math.round((currentTotalScore + updates.quiz_score) / newTotalQuizzes);

            newValues.quizzes_taken = newTotalQuizzes;
            newValues.avg_accuracy = newAvgAccuracy;
        } else if (updates.quizzes_taken) {
            newValues.quizzes_taken += updates.quizzes_taken;
        }

        // 4. Update the record
        const { data, error } = await supabase
            .from('user_progress')
            .update({
                hours_learned: newValues.hours_learned,
                assessments_taken: newValues.assessments_taken,
                learning_paths_created: newValues.learning_paths_created,
                quizzes_taken: newValues.quizzes_taken,
                avg_accuracy: newValues.avg_accuracy,
                learning_streak: newValues.learning_streak
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error("Error updating progress:", error);
            return false;
        }

        return data;
    } catch (e) {
        console.error("updateProgressMetric Exception:", e);
        return false;
    }
};
