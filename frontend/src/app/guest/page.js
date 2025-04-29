"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshAccessToken, handleLogout } from '../../utils/api';
import UserProfile from '../../components/UserProfile';
import GroupStatisticsTable from '../../components/admin/group/GroupStatisticsTable';
import { checkAuth } from '../../utils/auth';

export default function GuestDashboard() {
    const router = useRouter();
    const [login, setLogin] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMounted(true);
        }
    }, []);

    useEffect(() => {
        const authenticate = async () => {
            const { isAuthenticated, login } = await checkAuth("guest", router);
            setIsAuthenticated(isAuthenticated);
            setLogin(login);
        };

        authenticate();
    }, [router]);

    if (!isMounted || !isAuthenticated) return null;

    return (
        <div className="flex h-screen text-gray-900 bg-gradient-to-r from-teal-300 to-blue-400 relative">
            <main className="flex-1 bg-opacity-50 relative flex items-center justify-center">
                <GroupStatisticsTable />
            </main>
            
            <UserProfile login={login} onLogout={() => handleLogout(router)} />
        </div>
    );
}