'use client';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkAuth } from '../../utils/auth';
import { fetchTeacherStatements, handleLogout } from '../../utils/api';
import SidebarTeacherContent from '../../components/teacher/SidebarTeacherContent';
import Sidebar from '../../components/Sidebar';
import StudentForm from '../../components/teacher/StudentForm';
import UserProfile from '../../components/UserProfile';

export default function TeacherDashboard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState('');
    // Инициализируем состояние из localStorage сразу
    const [isArchiveMode, setIsArchiveMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('isArchiveMode');
            return saved ? JSON.parse(saved) : false;
        }
        return false;
    });

    // Проверка авторизации
    const { data: authData } = useQuery({
        queryKey: ['auth'],
        queryFn: () => checkAuth("teacher", router),
        staleTime: 30 * 60 * 1000,
    });

    // Загрузка ведомостей
    const { data: statements = [], refetch } = useQuery({
        queryKey: ['teacherStatements', isArchiveMode],
        queryFn: () => fetchTeacherStatements(isArchiveMode),
        enabled: !!authData?.isAuthenticated,
        staleTime: 5 * 60 * 1000,
    });

    // Сохраняем состояние архива при изменении
    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('isArchiveMode', JSON.stringify(isArchiveMode));
            refetch();
        }
    }, [isArchiveMode, refetch, isMounted]);

    // Восстанавливаем группу после проверки авторизации
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMounted(true);
            const savedGroup = localStorage.getItem('selectedGroup');
            if (savedGroup && authData?.isAuthenticated) {
                setSelectedGroup(savedGroup);
            }
        }
    }, [authData?.isAuthenticated]);


    useEffect(() => {
        if (statements.length) {
            console.log("Загруженные ведомости:", statements);
            console.log("Режим архива:", isArchiveMode);
        }
    }, [statements, isArchiveMode]);

    const handleGroupSelect = useCallback(async (groupId) => {
        if (!authData?.isAuthenticated) return;
        
        if (!groupId) {
            setSelectedGroup('');
            if (typeof window !== "undefined") {
                localStorage.removeItem("selectedGroup");
            }
            return;
        }
        
        setSelectedGroup(groupId);
        if (typeof window !== "undefined") {
            localStorage.setItem("selectedGroup", groupId);
        }
    }, [authData?.isAuthenticated]);

    const filteredStatements = useMemo(() => {
        if (!selectedGroup || !statements.length) return [];
        return statements.filter(statement => statement.groupId === selectedGroup);
    }, [selectedGroup, statements]);



    const handleCancelSelection = useCallback(() => {
        if (!authData?.isAuthenticated) return;
        setSelectedGroup('');
        if (typeof window !== "undefined") {
            localStorage.removeItem("selectedGroup");
        }
    }, [authData?.isAuthenticated]);

    const logoutMutation = useMutation({
        mutationFn: () => handleLogout(router),
        onError: (error) => {
            console.error("Ошибка при выходе:", error);
        }
    });
    
    if (!isMounted || !authData?.isAuthenticated) return null;

    return (
        <div className="flex h-screen text-gray-900 bg-gradient-to-r from-teal-300 to-blue-400 relative">
            <Sidebar>
                <SidebarTeacherContent 
                    statements={statements}
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    setSearchOpen={setSearchOpen}
                    isArchiveMode={isArchiveMode} // Передаем состояние архива
                    setIsArchiveMode={setIsArchiveMode} // Передаем функцию изменения состояния
                />
            </Sidebar>
    
            <main className="flex-1 bg-opacity-50 relative flex items-center justify-center">
                {!selectedGroup ? (
                    <div className="text-2xl font-semibold text-black bg-white p-6 rounded-lg shadow-md">
                        Пожалуйста, выберите группу...
                    </div>
                ) : (
                    <StudentForm
                        selectedGroup={selectedGroup}
                        filteredStatements={filteredStatements}
                        handleCancelSelection={handleCancelSelection}
                        teacherLogin={authData.login}
                        isArchiveMode={isArchiveMode} // Передаем состояние архива
                    />
                )}
            </main>
    
            <div className="w-16" />
    
            <UserProfile 
                login={authData.login} 
                onLogout={logoutMutation.mutate} 
            />
        </div>
    );
}