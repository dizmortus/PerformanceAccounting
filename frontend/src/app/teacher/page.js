"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth } from '../../utils/auth';
import {
    fetchWithAuth,
    refreshAccessToken,
    fetchTeacherStatements,
    fetchTeacherInfo,
    fetchDisciplineName
} from '../../utils/api';
import { handleLogout } from '../../utils/api';
import SidebarTeacherContent from '../../components/SidebarTeacherContent';
import Sidebar from '../../components/Sidebar';
import StudentForm from '../../components/StudentForm';
import UserProfile from '../../components/UserProfile';

export default function TeacherDashboard() {
    const router = useRouter();
    
    // Состояния приложения
    const [statements, setStatements] = useState([]);
    const [filteredStatements, setFilteredStatements] = useState([]);
    const [login, setLogin] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Флаг авторизации

    // Инициализация выбранной группы из localStorage
    const [selectedGroup, setSelectedGroup] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("selectedGroup") || '';
        }
        return '';
    });

// В компоненте TeacherDashboard
const handleGroupSelect = useCallback(async (groupId) => {
    if (!isAuthenticated) return;
    
    // Если передана пустая строка - снимаем выбор
    if (!groupId) {
        setSelectedGroup('');
        setFilteredStatements([]);
        if (typeof window !== "undefined") {
            localStorage.removeItem("selectedGroup");
        }
        return;
    }
    
    setSelectedGroup(groupId);
    if (typeof window !== "undefined") {
        localStorage.setItem("selectedGroup", groupId);
    }

    const filtered = statements.filter(statement => statement.groupId === groupId);
    const updatedStatements = await Promise.all(
        filtered.map(async (statement) => ({
            ...statement,
            disciplineName: (await fetchDisciplineName(statement.disciplineId)).name,
        }))
    );

    setFilteredStatements(updatedStatements);
}, [statements, isAuthenticated]);

    // Восстанавливаем состояние при загрузке
    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsMounted(true);
        }
    }, []);

    useEffect(() => {
        const authenticate = async () => {
            const { isAuthenticated, login } = await checkAuth("teacher", router);
            setIsAuthenticated(isAuthenticated);
            setLogin(login);
        };

        authenticate();
    }, [router]);

    useEffect(() => {
        const getStatements = async () => {
            if (!isAuthenticated) return;
            const statementsData = await fetchTeacherStatements();
            setStatements(statementsData);
        };

        getStatements();
    }, [isAuthenticated]);

    // Загружаем сохраненную группу при загрузке страницы
    useEffect(() => {
        if (!isAuthenticated) return; // Не выполняем действия, если пользователь не авторизован
        const savedGroup = localStorage.getItem("selectedGroup");
        if (savedGroup) {
            setSelectedGroup(savedGroup);
            handleGroupSelect(savedGroup);
        }
    }, [statements, handleGroupSelect, isAuthenticated]);

    const handleCancelSelection = () => {
        if (!isAuthenticated) return; // Не выполняем действия, если пользователь не авторизован
        setSelectedGroup('');
        setFilteredStatements([]);
        if (typeof window !== "undefined") {
            localStorage.removeItem("selectedGroup");
        }
    };

    // Если компонент еще не примонтирован или пользователь не авторизован, не рендерим ничего
    if (!isMounted || !isAuthenticated) return null;

    return (
        <div className="flex h-screen text-gray-900 bg-gradient-to-r from-teal-300 to-blue-400 relative">
            {/* Сайдбар */}
            <Sidebar>
                <SidebarTeacherContent 
                    statements={statements}
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect} // Передаем колбэк для выбора группы
                    setSearchOpen={setSearchOpen} 
                />
            </Sidebar>

            {/* Основной контент */}
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
                    />
                )}
            </main>

            {/* Форма пользователя */}
            <UserProfile login={login} onLogout={() => handleLogout(router)} />
        </div>
    );
}