'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkAuth } from '../../utils/auth';
import { fetchTeacherStatements, fetchDisciplineName, handleLogout } from '../../utils/api';
import SidebarTeacherContent from '../../components/teacher/SidebarTeacherContent';
import Sidebar from '../../components/Sidebar';
import StudentForm from '../../components/teacher/StudentForm';
import UserProfile from '../../components/UserProfile';
import { getTeacherGroups } from '../../utils/api';

export default function TeacherDashboard() {
    const router = useRouter();
    const queryClient = useQueryClient();
    
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState('');

    // Проверка авторизации
    const { data: authData } = useQuery({
        queryKey: ['auth'],
        queryFn: () => checkAuth("teacher", router),
        staleTime: 30 * 60 * 1000,
    });

 // Изменяем запрос для получения групп:
 const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['teacherGroups', authData?.login],
    queryFn: () => getTeacherGroups(authData.login).then(data => 
        Array.isArray(data) ? data : [] // Гарантируем, что data будет массивом
    ),
    enabled: !!authData?.login,
});

    // Загрузка ведомостей
    // const { data: statements = [] } = useQuery({
    //     queryKey: ['teacherStatements'],
    //     queryFn: fetchTeacherStatements,
    //     enabled: !!authData?.isAuthenticated,
    //     staleTime: 5 * 60 * 1000,
    // });

    // Обработчик выбора группы
    const handleGroupSelect = useCallback((groupId) => {
        if (!authData?.isAuthenticated) return;
        
        const newGroupId = selectedGroup === groupId ? '' : groupId;
        setSelectedGroup(newGroupId);
        
        if (typeof window !== "undefined") {
            newGroupId 
                ? localStorage.setItem("selectedGroup", newGroupId)
                : localStorage.removeItem("selectedGroup");
        }
    }, [authData?.isAuthenticated, selectedGroup]);

    // // Фильтрация ведомостей для выбранной группы
    // const { data: filteredStatements = [] } = useQuery({
    //     queryKey: ['filteredStatements', selectedGroup, statements],
    //     queryFn: async () => {
    //         if (!selectedGroup || !statements.length) return [];
            
    //         return Promise.all(
    //             statements
    //                 .filter(statement => statement.groupId === selectedGroup)
    //                 .map(async statement => ({
    //                     ...statement,
    //                     disciplineName: (await queryClient.fetchQuery({
    //                         queryKey: ['disciplineName', statement.disciplineId],
    //                         queryFn: () => fetchDisciplineName(statement.disciplineId),
    //                         staleTime: Infinity
    //                     })).name,
    //                 }))
    //         );
    //     },
    //     enabled: !!selectedGroup && !!statements.length,
    // });

    // Восстановление выбранной группы
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMounted(true);
            const savedGroup = localStorage.getItem("selectedGroup");
            if (savedGroup && authData?.isAuthenticated) {
                setSelectedGroup(savedGroup);
            }
        }
    }, [authData?.isAuthenticated]);

    if (!isMounted || !authData?.isAuthenticated) return null;

    return (
        <div className="flex h-screen text-gray-900 bg-gradient-to-r from-teal-300 to-blue-400 relative">
            <Sidebar>
                <SidebarTeacherContent 
                    // statements={statements}
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    setSearchOpen={setSearchOpen}
                    groups={groups.map(id => ({ id }))}     
                    groupsLoading={groupsLoading}
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
                        // filteredStatements={filteredStatements}
                        onCancelSelection={() => handleGroupSelect('')}
                        teacherLogin={authData.login} // Передаем логин преподавателя
                    />
                )}
            </main>
    
            <div className="w-16" />
    
            <UserProfile 
                login={authData.login} 
                onLogout={() => handleLogout(router)} 
            />
        </div>
    );
}