import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, BookOpen, UserCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { createDefaultProgress } from '../lib/progress';
import './Auth.css';

export default function Signup() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState({
        name: '', email: '', dob: '', role: 'student', education: '', password: '', confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (step < 3) setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg("Passwords do not match");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            // 1. Sign up auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            // ...
            // 2. Insert into users table
            if (authData?.user) {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: authData.user.id,
                            name: formData.name,
                            email: formData.email,
                            date_of_birth: formData.dob,
                            role: formData.role,
                            educational_qualification: formData.education
                        }
                    ]);

                if (dbError) throw dbError;

                // 3. Create default progress record
                await createDefaultProgress(authData.user.id);
            }

            // Move to verification step
            setStep(4);
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = () => {
        // Mock successful verification, route to dashboard
        navigate('/app');
    };

    const handleResendConfirmation = async () => {
        if (!formData.email) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: formData.email,
            });
            if (error) throw error;
            alert('Verification email resent! Please check your inbox.');
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-panel animate-fade-in">
                <div className="auth-header">
                    <Link to="/" className="back-link">← Back to Home</Link>
                    <h2>Create Account</h2>
                    <p className="text-secondary">Join the next generation of learning.</p>
                </div>

                {/* Step Indicator */}
                {step < 4 && (
                    <div className="step-indicator">
                        <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                )}

                {errorMsg && (
                    <div style={{ color: 'var(--error)', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                        {errorMsg}
                    </div>
                )}

                <form className="auth-form" onSubmit={step === 3 ? handleSubmit : handleNext}>

                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="form-step animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon" />
                                    <input type="text" name="name" className="input-field with-icon" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input type="email" name="email" className="input-field with-icon" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Date of Birth</label>
                                <div className="input-wrapper">
                                    <Calendar size={18} className="input-icon" />
                                    <input type="date" name="dob" className="input-field with-icon" value={formData.dob} onChange={handleChange} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-full mt-4">
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Education Info */}
                    {step === 2 && (
                        <div className="form-step animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">I am a...</label>
                                <div className="radio-group">
                                    <label className={`radio-card ${formData.role === 'student' ? 'selected' : ''}`}>
                                        <input type="radio" name="role" value="student" checked={formData.role === 'student'} onChange={handleChange} className="hidden-radio" />
                                        <UserCircle size={24} />
                                        <span>Student</span>
                                    </label>
                                    <label className={`radio-card ${formData.role === 'teacher' ? 'selected' : ''}`}>
                                        <input type="radio" name="role" value="teacher" checked={formData.role === 'teacher'} onChange={handleChange} className="hidden-radio" />
                                        <BookOpen size={24} />
                                        <span>Teacher</span>
                                    </label>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Educational Qualification</label>
                                <select name="education" className="input-field select-field" value={formData.education} onChange={handleChange} required>
                                    <option value="" disabled>Select highest level</option>
                                    <option value="highschool">High School</option>
                                    <option value="bachelors">Bachelor's Degree</option>
                                    <option value="masters">Master's Degree</option>
                                    <option value="phd">PhD</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="btn-group mt-4">
                                <button type="button" className="btn btn-outline flex-1" onClick={() => setStep(1)}>Back</button>
                                <button type="submit" className="btn btn-primary flex-2">
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Password */}
                    {step === 3 && (
                        <div className="form-step animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">Password</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input type="password" name="password" className="input-field with-icon" placeholder="••••••••" value={formData.password} onChange={handleChange} required minLength="8" />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Confirm Password</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input type="password" name="confirmPassword" className="input-field with-icon" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required minLength="8" />
                                </div>
                            </div>

                            <div className="btn-group mt-4">
                                <button type="button" className="btn btn-outline flex-1" onClick={() => setStep(2)} disabled={loading}>Back</button>
                                <button type="submit" className="btn btn-primary flex-2 btn-glow" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Email Verification Mock */}
                    {step === 4 && (
                        <div className="form-step verification-step animate-fade-in text-center">
                            <div className="success-icon-wrapper mb-4">
                                <Mail size={48} className="text-secondary pulse-animation" />
                            </div>
                            <h3>Verify your email</h3>
                            <p className="text-secondary mb-6">
                                We've sent a verification link to <br />
                                <strong className="text-primary">{formData.email || 'your email'}</strong>
                            </p>

                            <button type="button" className="btn btn-primary w-full" onClick={handleVerify}>
                                <CheckCircle2 size={18} /> Simulate Email Verification
                            </button>

                            <button type="button" className="btn btn-ghost mt-4 w-full text-sm" onClick={handleResendConfirmation} disabled={loading}>
                                {loading ? 'Sending...' : "Didn't receive it? Click to resend."}
                            </button>
                        </div>
                    )}

                </form>

                {step < 4 && (
                    <div className="auth-footer">
                        <p className="text-sm">Already have an account? <Link to="/login" className="text-gradient font-semibold">Log In</Link></p>
                    </div>
                )}
            </div>

            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2" style={{ background: 'var(--accent-secondary)' }}></div>
            </div>
        </div>
    );
}
