import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home,
    Map,
    CheckSquare,
    Code,
    LogOut,
    Bot
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isOpen, setIsOpen }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header desktop-only">
                <h2 className="text-gradient">GenAI Tutor</h2>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/app" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Home size={20} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/app/generate-path" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Map size={20} />
                    <span>Learning Paths</span>
                </NavLink>

                <NavLink to="/app/assessment" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <CheckSquare size={20} />
                    <span>Assessments</span>
                </NavLink>

                <NavLink to="/app/sandbox" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Code size={20} />
                    <span>AI Sandbox</span>
                </NavLink>

                <NavLink to="/app/chat" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Bot size={20} />
                    <span>AI Tutor Chat</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout} className="btn btn-ghost logout-btn">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
