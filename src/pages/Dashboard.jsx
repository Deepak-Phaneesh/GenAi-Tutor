import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { fetchUserProgress, updateLoginStreak } from '../lib/progress';
import { fetchLearningSessions, fetchAssessmentsTaken, fetchActiveLearningPath, fetchLearningPathTopics, fetchLearningPathAssessments, fetchActiveLearningPaths } from '../lib/analytics';
import { supabase } from '../lib/supabaseClient';
import {
    Clock,
    BookOpen,
    Map as MapIcon,
    CheckSquare,
    Target,
    TrendingUp,
    Award,
    Sparkles,
    X,
    Flame,
    ArrowRight
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import './Dashboard.css';

// Removed mock data for Pending Assessments and Recent Paths

export default function Dashboard() {
    const { user } = useAuth();
    const [assessmentsTaken, setAssessmentsTaken] = useState([]);
    const [recentPaths, setRecentPaths] = useState([]);
    const [userName, setUserName] = useState('');

    // Default metrics if DB is empty
    const [stats, setStats] = useState([
        { title: 'Current Streak', value: '0 Days', icon: Flame, trend: '+0%', color: '#f59e0b' },
        { title: 'Total Playtime', value: '0h', icon: Clock, trend: '+0%', color: '#3b82f6' },
        { title: 'Assessments Taken', value: '0', icon: CheckSquare, trend: '0 new', color: '#10b981' },
    ]);

    const [pieData, setPieData] = useState([]);
    const [lineData, setLineData] = useState([]);
    const [isPieLoading, setIsPieLoading] = useState(true);
    const [isLineLoading, setIsLineLoading] = useState(true);
    const [lineChartFilter, setLineChartFilter] = useState('All Topics');
    const [availableTopics, setAvailableTopics] = useState([]);

    const [activePath, setActivePath] = useState(null);
    const [isActivePathLoading, setIsActivePathLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.id) {
            const fetchData = async () => {
                // Update login streak first (idempotent — safe to call every render)
                await updateLoginStreak(user.id);
                const dbProgress = await fetchUserProgress(user.id);


                // Fetch chart data, recent assessments, and active learning path in parallel
                setIsPieLoading(true);
                setIsLineLoading(true);
                setIsActivePathLoading(true);
                const [sessionsData, topicsData, timelineData, recentAssessments, userProfileData, activePathsData, allPathsData] = await Promise.all([
                    fetchLearningSessions(user.id),
                    fetchLearningPathTopics(user.id),
                    fetchLearningPathAssessments(user.id),
                    fetchAssessmentsTaken(user.id), // Get array of recent assessments taken
                    supabase.from('users').select('name').eq('id', user.id).single(),
                    fetchActiveLearningPath(user.id),
                    fetchActiveLearningPaths(user.id)
                ]);

                // Update charts
                setPieData(sessionsData); // Renamed from setLearningData
                setAvailableTopics(topicsData);

                // Filter Timeline Data if a specific topic is selected
                let filteredTimeline = timelineData;
                if (lineChartFilter !== 'All Topics') {
                    filteredTimeline = timelineData.map(week => ({
                        week: week.week,
                        rawWeekNum: week.rawWeekNum,
                        [lineChartFilter]: week[lineChartFilter]
                    })).filter(week => week[lineChartFilter] !== undefined);
                }
                setLineData(filteredTimeline);

                setAssessmentsTaken(recentAssessments);
                if (userProfileData?.data?.name) {
                    setUserName(userProfileData.data.name);
                } else {
                    setUserName('Student');
                }

                if (activePathsData) {
                    setActivePath(activePathsData);
                } else {
                    setActivePath(null);
                }

                setRecentPaths(allPathsData || []);

                setIsPieLoading(false);
                setIsLineLoading(false);
                setIsActivePathLoading(false);

                // Update total playtime in stats based on real data
                const totalHours = sessionsData.reduce((sum, item) => sum + item.value, 0);

                // Update stats array dynamically
                setStats([
                    { title: 'Current Streak', value: `${dbProgress?.learning_streak || 0} Days`, icon: Flame, trend: 'Active', color: '#f59e0b' },
                    { title: 'Total Playtime', value: `${totalHours}h`, icon: Clock, trend: 'Updated', color: '#3b82f6' },
                    { title: 'Assessments Taken', value: `${dbProgress?.assessments_taken || 0}`, icon: CheckSquare, trend: 'Completed', color: '#10b981' },
                ]);
            };
            fetchData();

            // Listen for background updates from other components
            window.addEventListener('refresh-dashboard', fetchData);
            return () => window.removeEventListener('refresh-dashboard', fetchData);
        }
    }, [user, lineChartFilter]); // Added lineChartFilter to dependencies for refetching line data

    // Removed old localStorage sync logic

    return (
        <div className="dashboard-container">
            <header className="dashboard-header animate-fade-in">
                <div>
                    <h1 className="text-gradient">Welcome back, {userName ? userName.split(' ')[0] : 'Student'}!</h1>
                    <p className="text-secondary">Here's your learning overview for today.</p>
                </div>
                <div className="streak-badge glass-panel">
                    <Award className="text-warning" size={24} />
                    <div className="streak-info">
                        <span className="streak-count">{stats[0].value}</span> {/* Updated to use stats */}
                        <span className="streak-label">Learning Streak</span>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid mt-6">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card glass-panel animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className={`stat-icon-wrapper`} style={{ backgroundColor: `${stat.color}33` }}> {/* Dynamic background color */}
                            <stat.icon className="text-white" style={{ color: stat.color }} size={24} /> {/* Dynamic icon color */}
                        </div>
                        <div className="stat-content">
                            <h3>{stat.value}</h3>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid mt-6">
                <div className="dashboard-charts-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minWidth: 0 }}>
                    {/* Progress Chart */}
                    <div className="dashboard-card chart-card glass-panel animate-fade-in" style={{ animationDelay: '0.5s' }}>
                        <div className="card-header">
                            <h3>Learning Hours by Category</h3>
                        </div>
                        <div className="chart-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isPieLoading ? (
                                <div className="text-secondary flex flex-col items-center justify-center w-full min-h-[300px]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p>Loading analytics...</p>
                                </div>
                            ) : pieData.length === 0 ? (
                                <div className="text-center w-full p-6 text-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapIcon size={40} className="mb-4 opacity-50 text-secondary" style={{ display: 'block', margin: '0 auto' }} />
                                    <p align="center">No learning activity yet</p>
                                    <p align="center" className="text-sm mt-2">Start a learning path to track your progress</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={50}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1500}
                                            onClick={(data, index) => setActiveCategory(pieData[index])}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value, name) => [`${value} hours`, name]}
                                        />
                                        <Legend verticalAlign="bottom" height={24} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Weekly Assessment Line Graph */}
                    <div className="dashboard-card chart-card glass-panel animate-fade-in" style={{ animationDelay: '0.6s' }}>
                        <div className="card-header">
                            <h3>Weekly Assessment Scores</h3>
                            {availableTopics.length > 0 && (
                                <select
                                    className="chart-filter"
                                    value={lineChartFilter}
                                    onChange={(e) => setLineChartFilter(e.target.value)}
                                >
                                    <option value="All Topics">All Topics</option>
                                    {availableTopics.map(topic => (
                                        <option key={topic} value={topic}>{topic}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="chart-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isLineLoading ? (
                                <div className="text-secondary flex flex-col items-center justify-center w-full min-h-[300px]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p>Loading scores...</p>
                                </div>
                            ) : lineData.length === 0 ? (
                                <div className="text-center w-full p-6 text-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                                    <Target size={40} className="mb-4 opacity-50 text-secondary" style={{ display: 'block', margin: '0 auto' }} />
                                    <p align="center">No weekly assessments completed yet</p>
                                    <p align="center" className="text-sm mt-2">Complete your learning path assessments to track progress</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="week" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            formatter={(value, name) => [`${value}%`, `Topic: ${name}`]}
                                            labelStyle={{ color: '#fff', marginBottom: '4px', fontWeight: 'bold' }}
                                            labelFormatter={(label) => `${label}`}
                                        />
                                        {(lineChartFilter === 'All Topics' ? availableTopics : [lineChartFilter]).map((topic, i) => {
                                            const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
                                            return (
                                                <Line
                                                    key={topic}
                                                    type="monotone"
                                                    dataKey={topic}
                                                    name={topic}
                                                    stroke={colors[i % colors.length]}
                                                    strokeWidth={3}
                                                    dot={{ fill: colors[i % colors.length], strokeWidth: 2, r: 6 }}
                                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                                    animationDuration={1500}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Details Modal */}
                {activeCategory && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="glass-panel max-w-md w-full mx-4 relative p-8 animate-slide-up" style={{ minWidth: '400px' }}>
                            <button
                                className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
                                onClick={() => setActiveCategory(null)}
                            >
                                <X size={24} />
                            </button>

                            <div className="mb-6 flex items-center gap-4 border-b border-light pb-4">
                                <div className="w-4 h-12 rounded" style={{ backgroundColor: activeCategory.color }}></div>
                                <div>
                                    <h2 className="text-2xl font-bold">{activeCategory.name}</h2>
                                    <p className="text-secondary">{activeCategory.value}% of Total Learning</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="info-group">
                                    <label className="text-sm text-secondary uppercase tracking-wider mb-2 block flex items-center gap-2"><Clock size={16} /> Time Spent</label>
                                    <p className="text-xl font-mono text-primary bg-black bg-opacity-30 p-3 rounded-lg border border-light">{activeCategory.timeSpent}</p>
                                </div>

                                <div className="info-group">
                                    <label className="text-sm text-secondary uppercase tracking-wider mb-3 block flex items-center gap-2"><BookOpen size={16} /> Key Topics Covered</label>
                                    <ul className="space-y-2">
                                        {activeCategory.topics.map((topic, i) => (
                                            <li key={i} className="flex items-center gap-3 bg-white bg-opacity-5 p-3 rounded-lg border border-light">
                                                <Target size={16} className="text-tertiary flex-shrink-0" />
                                                <span>{topic}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dynamic Widgets Column */}
                <div className="widgets-column">
                    {/* Active Course */}
                    <div className="dashboard-card glass-panel animate-fade-in" style={{ animationDelay: '0.6s' }}>
                        {isActivePathLoading ? (
                            <div className="text-secondary py-6 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto block"></div>
                                <p className="text-sm">Loading active paths...</p>
                            </div>
                        ) : activePath ? (
                            <>
                                <div className="card-header mb-4">
                                    <h3 className="flex align-center gap-2 text-primary font-bold"><Sparkles size={20} /> Current Active AI Path</h3>
                                </div>
                                <div className="widget-list">
                                    <div className="widget-item">
                                        <div className="widget-icon bg-primary-light">
                                            <MapIcon className="text-primary" size={18} />
                                        </div>
                                        <div className="widget-details w-full">
                                            <div className="text-white font-semibold">
                                                {activePath.skill}
                                            </div>
                                            <div className="progress-wrapper">
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${activePath.progress}%` }}></div>
                                                </div>
                                                <span className="progress-text">{activePath.progress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="card-header border-none justify-center mb-0">
                                    <h3 className="text-xl flex align-center gap-2 text-primary font-bold"><Sparkles size={20} /> Current Active AI Path</h3>
                                </div>
                                <div className="text-secondary pb-6 pt-2">
                                    <p className="text-sm mt-2">No active learning path yet</p>
                                </div>
                                <button className="btn btn-primary w-full flex justify-center align-center gap-2" onClick={() => navigate('/app/generate-path')}>Generate Learning Path</button>
                            </div>
                        )}
                    </div>

                    {/* Assessments Widget */}
                    <div className="dashboard-card widget-card glass-panel animate-fade-in" style={{ animationDelay: '0.7s' }}>
                        <div className="card-header border-b border-light pb-4 mb-4">
                            <h3 className="flex align-center gap-2">
                                <CheckSquare className="text-primary" size={20} />
                                Assessments Taken
                            </h3>
                            <button className="btn-icon">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                        <div className="card-body">
                            {assessmentsTaken.length > 0 ? (
                                <ul className="recent-list">
                                    {assessmentsTaken.slice(0, 3).map((assessment, i) => (
                                        <li key={i} className="list-item !p-4 !mb-2 last:!mb-0" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <div className="flex flex-col w-full text-left">
                                                {/* Title */}
                                                <div className="text-lg font-bold text-white mb-1">
                                                    {assessment.skill}
                                                </div>

                                                {/* Progress Bar Row */}
                                                <div className="progress-wrapper mb-1" style={{ marginTop: 0 }}>
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${assessment.score}%` }}></div>
                                                    </div>
                                                    <span className="progress-text">{assessment.score}%</span>
                                                </div>

                                                {/* Domain + Level */}
                                                <div className="text-sm text-purple-400">
                                                    {assessment.domain} • {assessment.level}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state py-8 flex items-center justify-center gap-3 text-center w-full min-h-[140px]">
                                    <CheckSquare size={28} className="text-primary opacity-80 flex-shrink-0" />
                                    <p className="text-sm text-secondary m-0 max-w-[420px] leading-relaxed">
                                        No assessments taken yet. Visit the Assessments tab to start.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Paths */}
                    <div className="dashboard-card glass-panel animate-fade-in" style={{ animationDelay: '0.7s' }}>
                        <div className="card-header">
                            <h3>Recent Paths</h3>
                            <button className="btn-link">View All</button>
                        </div>
                        <div className="widget-list">
                            {recentPaths.length > 0 ? (
                                recentPaths.map(item => (
                                    <div key={item.id} className="widget-item">
                                        <div className="widget-icon bg-primary-light">
                                            <TrendingUp className="text-primary" size={18} />
                                        </div>
                                        <div className="widget-details w-full">
                                            <h4>{item.domain} - {item.skill}</h4>
                                            <div className="progress-wrapper">
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${item.progress}%` }}></div>
                                                </div>
                                                <span className="progress-text">{item.progress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-secondary py-4 w-full">
                                    <p className="text-sm">No recent paths found.<br />Start generating paths to see them here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
