import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Auth.css';

export default function Login() {
    const navigate = useNavigate();
    const [view, setView] = useState('login'); // login | forgot | verify | reset
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            navigate('/app');
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            setView('verify');
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setView('login');
            setPassword('');
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

                    {view === 'login' && (
                        <>
                            <h2>Welcome Back</h2>
                            <p className="text-secondary">Sign in to continue your learning journey.</p>
                        </>
                    )}
                    {view === 'forgot' && (
                        <>
                            <h2>Password Reset</h2>
                            <p className="text-secondary">Enter your email to receive a verification code.</p>
                        </>
                    )}
                    {view === 'verify' && (
                        <>
                            <h2>Check your Email</h2>
                            <p className="text-secondary">We sent a 6-digit code to {email || 'your email'}.</p>
                        </>
                    )}
                    {view === 'reset' && (
                        <>
                            <h2>New Password</h2>
                            <p className="text-secondary">Create a new secure password.</p>
                        </>
                    )}
                </div>

                {errorMsg && (
                    <div style={{ color: 'var(--error)', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                        {errorMsg === 'Invalid login credentials' ? (
                            <>
                                {errorMsg}<br />
                                <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.5rem', display: 'block' }}>
                                    Hint: Make sure your email is confirmed. Check your inbox or Supabase dashboard.
                                </span>
                            </>
                        ) : errorMsg}
                    </div>
                )}

                <div className="auth-form">
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input type="email" className="input-field with-icon" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="flex justify-between w-full">
                                    <label className="input-label">Password</label>
                                    <button type="button" className="btn-link text-sm" onClick={() => setView('forgot')}>Forgot password?</button>
                                </div>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input type="password" className="input-field with-icon" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-full mt-6 btn-glow" disabled={loading}>
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleResetRequest} className="animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">Email Address</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon" />
                                    <input type="email" className="input-field with-icon" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>

                            <div className="btn-group mt-6">
                                <button type="button" className="btn btn-outline flex-1" onClick={() => setView('login')} disabled={loading}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-2" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Code'}
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'verify' && (
                        <form onSubmit={(e) => { e.preventDefault(); setView('reset'); }} className="animate-fade-in text-center">
                            <div className="verification-code-group">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <input key={i} type="text" maxLength="1" className="code-input" required />
                                ))}
                            </div>
                            <button type="submit" className="btn btn-primary w-full mt-6">Verify Code</button>
                        </form>
                    )}

                    {view === 'reset' && (
                        <form onSubmit={handleUpdatePassword} className="animate-fade-in">
                            <div className="input-group">
                                <label className="input-label">New Password</label>
                                <div className="input-wrapper">
                                    <KeyRound size={18} className="input-icon" />
                                    <input type="password" className="input-field with-icon" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Confirm New Password</label>
                                <div className="input-wrapper">
                                    <KeyRound size={18} className="input-icon" />
                                    <input type="password" className="input-field with-icon" placeholder="••••••••" required />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full mt-6" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset & Login'}
                            </button>
                        </form>
                    )}
                </div>

                {view === 'login' && (
                    <div className="auth-footer">
                        <p className="text-sm">Don't have an account? <Link to="/signup" className="text-gradient font-semibold">Sign Up</Link></p>
                    </div>
                )}
            </div>

            <div className="bg-blobs">
                <div className="blob blob-1" style={{ background: 'var(--accent-secondary)' }}></div>
                <div className="blob blob-2" style={{ background: 'var(--accent-tertiary)' }}></div>
            </div>
        </div>
    );
}
