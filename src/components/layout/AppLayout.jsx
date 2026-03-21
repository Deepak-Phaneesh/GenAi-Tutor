import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

export default function AppLayout() {
    const mainRef = useRef(null);
    const { pathname } = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
        // Always close sidebar on mobile when navigating
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="app-container" style={{ width: '100%' }}>
            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="mobile-header-content">
                    <h2 className="text-gradient">GenAI Tutor</h2>
                    <button 
                        className="btn btn-ghost menu-toggle" 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Backdrop overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="sidebar-backdrop" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            <main ref={mainRef} className="main-content">
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
