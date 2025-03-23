"use client";
import { useState, useEffect } from 'react';
import { FaSearch, FaUsers, FaChevronRight } from 'react-icons/fa';
import { fetchGroups } from '../utils/api';

const SidebarTeacherContent = ({ statements, selectedGroup, onGroupSelect, setSearchOpen }) => {
    const [groups, setGroups] = useState([]);

    // Загрузка групп
    useEffect(() => {
        const loadGroups = async () => {
            const uniqueGroupIds = [...new Set(statements.map(s => s.groupId))];
            const groupsData = await fetchGroups(uniqueGroupIds);
            const sortedGroups = groupsData.sort((a, b) => a.id - b.id); // Сортировка по возрастанию id
            setGroups(sortedGroups);
        };

        if (statements.length > 0) {
            loadGroups();
        }
    }, [statements]);

    // Обработчик выбора группы
    const handleGroupSelect = (groupId) => {
        onGroupSelect(groupId); // Вызываем колбэк из TeacherDashboard
    };

    return (
        <>
            {/* Кнопка поиска */}
            <div className="absolute top-4 right-4 flex items-center space-x-4">
                <button 
                    className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition relative group text-lg"
                    onClick={() => setSearchOpen(true)}
                >
                    <FaSearch />
                    <span className="absolute right-full mr-2 w-max bg-gray-300 text-gray-900 text-sm rounded p-1 opacity-0 group-hover:opacity-100 transition">Поиск</span>
                </button>
            </div>

            {/* Заголовок */}
            <div className="mt-12 px-2">
                <h2 className="text-lg font-semibold text-black text-center mb-3">Группы</h2>
            </div>

            {/* Список групп */}
            <div className="flex-grow overflow-y-auto space-y-3 p-2">
                {groups.map((group) => (
                    <button 
                        key={group.id} 
                        className={`flex items-center justify-between w-full p-3 text-gray-900 shadow rounded-lg transition border-l-4 
                                    ${selectedGroup === group.id ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-200 border-teal-500'} 
                                    hover:bg-teal-500 hover:text-white hover:shadow-lg hover:scale-[1.02]`}
                        onClick={() => handleGroupSelect(group.id)}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-full transition 
                                            ${selectedGroup === group.id ? 'bg-white text-teal-600' : 'bg-teal-500 text-white'} 
                                            group-hover:bg-white group-hover:text-teal-500`}>
                                <FaUsers className="text-base" />
                            </div>
                            <span className="text-base font-medium">{group.id}</span>
                        </div>
                        <FaChevronRight className={`text-gray-500 text-sm transition 
                                                    ${selectedGroup === group.id ? 'text-white' : 'group-hover:text-white'}`} />
                    </button>
                ))}
            </div>
        </>
    );
};

export default SidebarTeacherContent;