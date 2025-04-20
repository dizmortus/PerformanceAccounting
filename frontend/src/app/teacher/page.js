"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkAuth } from '../../utils/auth';
import { fetchTeacherStatements, fetchDisciplineName, handleLogout } from '../../utils/api';
import SidebarTeacherContent from '../../components/teacher/SidebarTeacherContent';
import Sidebar from '../../components/Sidebar';
import StudentForm from '../../components/teacher/StudentForm';
import UserProfile from '../../components/UserProfile';

export default function TeacherDashboard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    
    // Состояния UI
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState('');

    // Проверка авторизации с использованием React Query
    const { data: authData } = useQuery({
        queryKey: ['auth'],
        queryFn: () => checkAuth("teacher", router),
        staleTime: 30 * 60 * 1000, // 30 минут кэширования
    });

    // Загрузка ведомостей с кэшированием
    const { data: statements = [] } = useQuery({
        queryKey: ['teacherStatements'],
        queryFn: fetchTeacherStatements,
        enabled: !!authData?.isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 минут кэширования
    });

    // Обработчик выбора группы с оптимизированными запросами
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

    // Загрузка названий дисциплин с кэшированием
    const { data: filteredStatements = [] } = useQuery({
        queryKey: ['filteredStatements', selectedGroup, statements],
        queryFn: async () => {
            if (!selectedGroup || !statements.length) return [];
            
            const filtered = statements.filter(statement => statement.groupId === selectedGroup);
            return Promise.all(
                filtered.map(async (statement) => ({
                    ...statement,
                    disciplineName: (await queryClient.fetchQuery({
                        queryKey: ['disciplineName', statement.disciplineId],
                        queryFn: () => fetchDisciplineName(statement.disciplineId),
                        staleTime: Infinity // Названия дисциплин редко меняются
                    })).name,
                }))
            );
        },
        enabled: !!selectedGroup && !!statements.length,
    });

    // Восстановление выбранной группы при загрузке
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMounted(true);
            const savedGroup = localStorage.getItem("selectedGroup");
            if (savedGroup && authData?.isAuthenticated) {
                setSelectedGroup(savedGroup);
            }
        }
    }, [authData?.isAuthenticated]);

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
            // Дополнительная обработка ошибок UI
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
                />
            </Sidebar>
    
            <main className="flex-1 bg-opacity-50 relative flex items-center justify-center">
                {!selectedGroup ? (
                    <div className="text-2xl font-semibold text-white bg-transparent p-6 rounded-lg">
                        Пожалуйста, выберите группу...
                    </div>
                ) : (
                    <StudentForm
                        selectedGroup={selectedGroup}
                        filteredStatements={filteredStatements}
                        handleCancelSelection={handleCancelSelection}
                        teacherLogin={authData.login} // Передаем логин преподавателя
                    />
                )}
            </main>
    
            {/* Пустой div, равный закрытому сайдбару */}
            <div className="w-16" />
    
            <UserProfile 
                login={authData.login} 
                onLogout={logoutMutation.mutate} 
            />
        </div>
    );
}