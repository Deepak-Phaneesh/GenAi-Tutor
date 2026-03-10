import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, BrainCircuit, Code, Globe } from 'lucide-react';
import './Landing.css';

export default function Landing() {
    return (
        <div className="landing-page">
            <nav className="landing-nav glass-panel animate-fade-in">
                <div className="logo">
                    <BrainCircuit className="logo-icon" size={28} />
                    <span className="text-gradient font-bold" style={{ fontSize: '1.25rem' }}>GenAI Tutor</span>
                </div>
                <div className="nav-links">
                    <Link to="/login" className="btn btn-ghost">Log In</Link>
                    <Link to="/signup" className="btn btn-primary">
                        Get Started <ArrowRight size={18} />
                    </Link>
                </div>
            </nav>

            <main className="hero-section full-width-layout">
                <div className="hero-content">
                    <div className="hero-text-side animate-fade-in">
                        <div className="badge mb-6">
                            <Sparkles size={16} />
                            <span>Next-Generation Learning</span>
                        </div>

                        <h1 className="hero-title mb-6">
                            Master Your Future With <br />
                            <span className="text-gradient">AI-Powered</span> Education.
                        </h1>

                        <p className="hero-subtitle mb-8">
                            Adaptive learning paths, real-time assessments, and a dynamic AI sandbox.
                            Whether you're exploring IT, languages, or specialized skills, your personalized journey starts here.
                        </p>

                        <div className="hero-actions mb-12">
                            <Link to="/signup" className="btn btn-primary btn-lg pulse-hover">
                                Start Learning Now <ArrowRight size={20} />
                            </Link>
                            <Link to="/login" className="btn btn-outline btn-lg">
                                View Dashboard
                            </Link>
                        </div>

                        <div className="features-grid">
                            <div className="feature-card glass-panel">
                                <BrainCircuit size={24} className="feature-icon text-primary" />
                                <h3>Adaptive Paths</h3>
                                <p>Curriculums that evolve based on your weekly performance.</p>
                            </div>
                            <div className="feature-card glass-panel">
                                <Code size={24} className="feature-icon text-secondary" />
                                <h3>Interactive Sandbox</h3>
                                <p>Practice coding and run snippets directly in the browser.</p>
                            </div>
                            <div className="feature-card glass-panel">
                                <Globe size={24} className="feature-icon text-tertiary" />
                                <h3>AI Assistant</h3>
                                <p>Get instant help from our integrated 24/7 AI tutor bot.</p>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visual-side hidden lg:flex">
                        <div className="visual-container glass-panel animate-pulse-glow">
                            <div className="floating-elements">
                                <BrainCircuit size={120} className="text-primary-glow" />
                                <div className="glow-circle"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Abstract Background Elements */}
                <div className="bg-blobs">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                </div>
            </main>
        </div>
    );
}
