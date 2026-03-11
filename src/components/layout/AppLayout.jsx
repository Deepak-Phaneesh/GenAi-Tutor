import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const mainRef = useRef(null);
    const { pathname } = useLocation();

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [pathname]);

    return (
        <div className="app-container" style={{ width: '100%' }}>
            <Sidebar />
            <main ref={mainRef} className="main-content">
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
