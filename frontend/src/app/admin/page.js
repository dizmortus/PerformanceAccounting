"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    refreshAccessToken,
    fetchTeacherInfo,
    handleLogout
} from '../../utils/api';
import SidebarAdminContent from '../../components/SidebarAdminContent';
import Sidebar from '../../components/Sidebar';
import UserProfile from '../../components/UserProfile';
import UserTable from '../../components/UserTable';
import StatementTable from '../../components/StatementTable';
import { checkAuth } from '../../utils/auth';

export default function AdminDashboard() {
    const router = useRouter();
    const [login, setLogin] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("selectedCategory") || null;
        }
        return null;
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMounted(true);
        }
    }, []);

    useEffect(() => {
        const authenticate = async () => {
            const { isAuthenticated, login } = await checkAuth("admin", router);
            setIsAuthenticated(isAuthenticated);
            setLogin(login);
        };

        authenticate();
    }, [router]);

    const handleCategorySelect = (categoryId) => {
        if (!isAuthenticated) return;
        
        // Если кликнули на уже выбранную категорию - снимаем выбор
        if (selectedCategory === categoryId) {
            setSelectedCategory(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("selectedCategory");
            }
        } else {
            setSelectedCategory(categoryId);
            if (typeof window !== "undefined") {
                localStorage.setItem("selectedCategory", categoryId);
            }
        }
    };

    const handleCancel = () => {
        if (!isAuthenticated) return;
        setSelectedCategory(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem("selectedCategory");
        }
    };

    if (!isMounted || !isAuthenticated) return null;

    return (
        <div className="flex h-screen text-gray-900 bg-gradient-to-r from-teal-300 to-blue-400 relative">
            <Sidebar>
                <SidebarAdminContent 
                    selectedCategory={selectedCategory} 
                    handleCategorySelect={handleCategorySelect} 
                />
            </Sidebar>

            <main className="flex-1 bg-opacity-50 relative flex items-center justify-center">
                {!selectedCategory ? (
                    <div className="text-2xl font-semibold text-white bg-transparent p-6 rounded-lg">
                        Пожалуйста, выберите категорию...
                    </div>
                ) : (
                    <>
                        {selectedCategory === 'users' && <UserTable onCancel={handleCancel} />}
                        {selectedCategory === 'statements' && <StatementTable onCancel={handleCancel} />}
                    </>
                )}
            </main>

            <UserProfile login={login} onLogout={() => handleLogout(router)} />
        </div>
    );
}