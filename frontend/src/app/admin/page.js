"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    refreshAccessToken,
    fetchTeacherInfo,
    handleLogout
} from '../../utils/api';
import SidebarAdminContent from '../../components/admin/SidebarAdminContent';
import Sidebar from '../../components/Sidebar';
import UserProfile from '../../components/UserProfile';
import UserTable from '../../components/admin/user/UserTable';
import StatementTable from '../../components/admin/statement/StatementTable';
import GroupTable from '../../components/admin/group/GroupTable';
import StudentTable from '../../components/admin/student/StudentTable';
import DisciplineTable from '../../components/admin/discipline/DisciplineTable';
//import StatisticsTable from '../../components/admin/statement/StatementStatisticsTable';
//import PerformanceTable from '../../components/admin/student/StudentStatisticsTable';
import GroupStatisticsTable from '../../components/admin/group/GroupStatisticsTable';
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
                     <div className="text-2xl font-semibold text-black bg-white p-6 rounded-lg shadow-md">
                        Пожалуйста, выберите категорию...
                    </div>
                ) : (
                    <>
                        {selectedCategory === 'users' && (
                            <UserTable 
                                onCancel={handleCancel} 
                                currentUserLogin={login}
                            />
                        )}
                        {selectedCategory === 'statements' && (
                            <StatementTable 
                                onCancel={handleCancel}
                                currentUserLogin={login}
                            />
                        )}
                        {selectedCategory === 'groups' && (
                            <GroupTable 
                                onCancel={handleCancel}
                            />
                        )}
                        {selectedCategory === 'students' && (
                            <StudentTable 
                                onCancel={handleCancel}
                            />
                        )}
                        {selectedCategory === 'disciplines' && (
                            <DisciplineTable 
                                onCancel={handleCancel}
                            />
                        )}
                        {selectedCategory === 'statistics' && (
                            <GroupStatisticsTable 
                                onCancel={handleCancel}
                            />
                        )}
                        {/* {selectedCategory === 'performance' && (
                            <PerformanceTable 
                                onCancel={handleCancel}
                            />
                        )} */}
                    </>
                )}
            </main>
            
            {/* Пустой div, равный закрытому сайдбару */}
            <div className="w-16" />

            <UserProfile login={login} onLogout={() => handleLogout(router)} />
        </div>
    );
}