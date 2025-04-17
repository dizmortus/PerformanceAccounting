import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaSearch, FaUsers, FaChevronRight, FaTimes } from 'react-icons/fa';
import { fetchStudents, fetchDisciplineName, getTeacherDisciplines } from '../../utils/api'; // добавляем getTeacherDisciplines

const GroupSearchModal = ({ isOpen, onClose, onGroupSelect, selectedGroup, groups }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Загрузка студентов для всех групп с использованием React Query
    const { data: allStudents = [], isLoading: isLoadingStudents } = useQuery({
        queryKey: ['allStudents', groups?.map(g => g.id)],
        queryFn: async () => {
            if (!groups?.length) return [];
            const studentsData = await Promise.all(
                groups.map(group =>
                    group?.id ? fetchStudents(group.id) : Promise.resolve([])
                )
            );

            return groups.flatMap((group, index) =>
                studentsData[index].map(student => ({
                    ...student,
                    groupId: group.id
                }))
            );
        },
        enabled: isOpen && !!groups?.length,
        staleTime: 5 * 60 * 1000,
    });

    // Загрузка дисциплин для каждой группы
    const { data: disciplinesMap = {} } = useQuery({
        queryKey: ['disciplinesMap', groups?.map(g => g.id)],
        queryFn: async () => {
            if (!groups?.length) return {};
            const disciplinesData = await Promise.all(
                groups.map(group => getTeacherDisciplines('teacherLogin', group.id)) // Поменять на реальный логин преподавателя
            );

            return groups.reduce((acc, group, index) => {
                acc[group.id] = disciplinesData[index] || [];
                return acc;
            }, {});
        },
        enabled: isOpen && !!groups?.length,
        staleTime: Infinity,
    });

    // Мемоизированные результаты поиска
    const searchResults = useMemo(() => {
        if (!isOpen || !searchTerm.trim()) return groups || [];

        const term = searchTerm.toLowerCase();

        // 1. Поиск по номеру группы
        const groupMatches = (groups || []).filter(group =>
            group?.id?.toLowerCase()?.includes(term)
        );

        // 2. Поиск по имени студента
        const studentMatches = allStudents.filter(student => {
            const searchWords = term.split(/\s+/).filter(word => word.length > 0);
            const studentData = [
                student?.lastName || '',
                student?.firstName || '',
                student?.patronymic || ''
            ].join(' ').toLowerCase();
            return searchWords.every(word => studentData.includes(word));
        });

        // 3. Находим группы для найденных студентов
        const studentGroupIds = [...new Set(
            studentMatches.map(student => student.groupId)
        )];

        // 4. Поиск по дисциплинам
        const disciplineGroupIds = [...new Set(
            (groups || [])
                .filter(group => {
                    const groupDisciplines = disciplinesMap[group.id] || [];
                    return groupDisciplines.some(discipline => 
                        discipline.toLowerCase().includes(term)
                    );
                })
                .map(group => group.id)
                .filter(Boolean)
        )];

        // Объединяем все совпадения и удаляем дубликаты
        return [
            ...groupMatches,
            ...(groups || []).filter(group =>
                group?.id && studentGroupIds.includes(group.id)
            ),
            ...(groups || []).filter(group =>
                group?.id && disciplineGroupIds.includes(group.id)
            )
        ].filter((group, index, self) =>
            index === self.findIndex(g => g.id === group.id)
        );
    }, [searchTerm, groups, allStudents, disciplinesMap, isOpen]);

    // Мемоизированная информация о совпадениях
    const getMatchInfo = useCallback((group) => {
        if (!group?.id) return { type: 'unknown', text: '' };

        const term = searchTerm.toLowerCase();
        const groupStudents = allStudents.filter(s => s.groupId === group.id);

        // Проверка совпадения по номеру группы
        if (group.id.toLowerCase().includes(term)) {
            return { type: 'group', text: group.id };
        }

        // Проверка совпадения по студенту
        const matchedStudent = groupStudents.find(student => {
            const fullName = [
                student?.lastName || '',
                student?.firstName || '',
                student?.patronymic || ''
            ].join(' ').toLowerCase();
            return fullName.includes(term);
        });

        if (matchedStudent) {
            return {
                type: 'student',
                text: [
                    matchedStudent.lastName,
                    matchedStudent.firstName,
                    matchedStudent.patronymic
                ].join(' ').trim()
            };
        }

        // Проверка совпадения по дисциплине
        const matchedDisciplines = (disciplinesMap[group.id] || [])
            .filter(discipline => discipline.toLowerCase().includes(term));

        if (matchedDisciplines.length > 0) {
            return {
                type: 'discipline',
                text: matchedDisciplines[0],
                allDisciplines: matchedDisciplines
            };
        }

        return { type: 'unknown', text: '' };
    }, [searchTerm, allStudents, disciplinesMap]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" style={{ height: '80vh', maxHeight: '600px' }}>
                <div className="flex justify-between items-center p-4 bg-teal-600 text-white rounded-t-xl">
                    <h3 className="text-lg font-semibold">Поиск группы</h3>
                    <button onClick={onClose} className="text-white hover:text-teal-200">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Введите номер группы, имя студента или дисциплину..."
                            className="w-full pl-10 pr-4 py-3 border-2 border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FaSearch className="absolute left-3 top-3.5 text-teal-500" />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 p-4">
                    {isLoadingStudents ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            {searchTerm ? 'Ничего не найдено' : 'Введите поисковый запрос'}
                        </div>
                    ) : (
                        searchResults.map((group) => {
                            const matchInfo = getMatchInfo(group);

                            return (
                                <button
                                    key={group.id}
                                    className={`flex items-center justify-between w-full p-3 text-gray-900 shadow rounded-lg transition border-l-4 
                                                ${selectedGroup === group.id ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-100 border-teal-400'} 
                                                hover:bg-teal-500 hover:text-white hover:shadow-lg`}
                                    onClick={() => {
                                        onGroupSelect(group.id);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full transition 
                                                        ${selectedGroup === group.id ? 'bg-white text-teal-600' : 'bg-teal-500 text-white'} 
                                                        group-hover:bg-white group-hover:text-teal-500`}>
                                            <FaUsers />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{group.id}</div>
                                            <div className={`text-sm ${selectedGroup === group.id ? 'text-teal-100' : 'text-gray-600'}`}>
                                                {matchInfo.type === 'group' && 'Группа'}
                                                {matchInfo.type === 'student' && `Студент: ${matchInfo.text}`}
                                                {matchInfo.type === 'discipline' && `Дисциплина: ${matchInfo.text}`}
                                            </div>
                                        </div>
                                    </div>
                                    <FaChevronRight className={`text-sm transition 
                                                                ${selectedGroup === group.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupSearchModal;
