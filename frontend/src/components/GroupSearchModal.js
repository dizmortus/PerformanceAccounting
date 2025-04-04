'use client';
import { useState, useEffect } from 'react';
import { FaSearch, FaUsers, FaChevronRight, FaTimes } from 'react-icons/fa';
import { fetchStudents, fetchDisciplineName } from '../utils/api';

const GroupSearchModal = ({ isOpen, onClose, onGroupSelect, selectedGroup, statements, groups }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [groupStudentMap, setGroupStudentMap] = useState({});
    const [disciplinesMap, setDisciplinesMap] = useState({});

    useEffect(() => {
        if (!isOpen) return; // Выходим, если модальное окно закрыто
        
        if (groups?.length) {
            const loadData = async () => {
                setIsLoading(true);
                try {
                    const studentsData = await Promise.all(
                        groups.map(group => 
                            group?.id ? fetchStudents(group.id) : Promise.resolve([])
                        )
                    );
                    
                    const newGroupStudentMap = {};
                    const allStudents = [];
                    
                    groups.forEach((group, index) => {
                        if (group.id) {
                            newGroupStudentMap[group.id] = studentsData[index];
                            const studentsWithGroup = studentsData[index].map(student => ({
                                ...student,
                                groupId: group.id
                            }));
                            allStudents.push(...studentsWithGroup);
                        }
                    });

                    const uniqueDisciplineIds = [...new Set(
                        statements.map(s => s.disciplineId).filter(Boolean)
                    )];

                    const disciplinesData = await Promise.all(
                        uniqueDisciplineIds.map(id => fetchDisciplineName(id))
                    );

                    const newDisciplinesMap = {};
                    disciplinesData.forEach(discipline => {
                        if (discipline?.id && discipline.name) {
                            newDisciplinesMap[discipline.id] = discipline.name;
                        }
                    });

                    setDisciplinesMap(newDisciplinesMap);
                    setGroupStudentMap(newGroupStudentMap);
                    setStudents(allStudents);
                } catch (error) {
                    console.error('Ошибка загрузки данных:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [isOpen, groups, statements]);

    useEffect(() => {
        if (!isOpen) return; // Выходим, если модальное окно закрыто
        
        if (!searchTerm.trim()) {
            setSearchResults(groups || []);
            return;
        }
    
        const term = searchTerm.toLowerCase();
        
        if (isOpen) { // Добавляем проверку isOpen для логов
            console.log('--- НАЧАЛО ПОИСКА ---');
            console.log('Поисковый запрос:', term);
            console.log('Все группы:', groups);
            console.log('Все студенты:', students);
            console.log('Все ведомости:', statements);
            console.log('Связь групп и студентов:', groupStudentMap);
            console.log('Карта дисциплин:', disciplinesMap);
        }
    
        // 1. Поиск по номеру группы
        const groupMatches = (groups || []).filter(group => 
            group?.id?.toLowerCase()?.includes(term)
        );
        
        if (isOpen) console.log('Найденные группы по номеру:', groupMatches);
    
        // 2. Поиск по имени студента
        const studentMatches = students.filter(student => {
            const searchWords = term.split(/\s+/).filter(word => word.length > 0);
            const studentData = [
                student?.lastName || '',
                student?.firstName || '',
                student?.patronymic || ''
            ].join(' ').toLowerCase();
            return searchWords.every(word => studentData.includes(word));
        });
        
        if (isOpen) console.log('Найденные студенты:', studentMatches);
    
        // 3. Находим группы для найденных студентов
        const groupsForStudents = Object.entries(groupStudentMap)
            .filter(([groupId, groupStudents]) => 
                groupStudents.some(student => 
                    studentMatches.some(matchedStudent => 
                        matchedStudent.id === student.id
                    )
                )
            )
            .map(([groupId]) => ({ id: groupId }));
            
        if (isOpen) console.log('Группы найденных студентов:', groupsForStudents);
    
        // 4. Поиск по дисциплинам
        if (isOpen) console.log('--- ПОИСК ПО ДИСЦИПЛИНАМ ---');
        
        const disciplineGroupIds = [...new Set(
            (statements || [])
                .filter(statement => {
                    const disciplineName = disciplinesMap[statement.disciplineId] || '';
                    const matches = disciplineName.toLowerCase().includes(term);
                    if (isOpen) console.log(`Проверка дисциплины "${disciplineName}" (ID: ${statement.disciplineId}):`, matches);
                    return matches;
                })
                .map(statement => statement.groupId)
                .filter(Boolean)
        )];
        
        if (isOpen) console.log('ID групп с подходящими дисциплинами:', disciplineGroupIds);
    
        // Объединяем все совпадения
        const allMatchedGroups = [
            ...groupMatches,
            ...groupsForStudents,
            ...(groups || []).filter(group => 
                group?.id && disciplineGroupIds.includes(group.id)
            )
        ];
        
        if (isOpen) console.log('Все совпавшие группы перед удалением дубликатов:', allMatchedGroups);
    
        // Удаляем дубликаты групп
        const uniqueGroups = allMatchedGroups.reduce((acc, group) => {
            if (group?.id && !acc.some(g => g.id === group.id)) {
                acc.push(group);
            }
            return acc;
        }, []);
        
        if (isOpen) console.log('Уникальные группы после поиска:', uniqueGroups);
    
        setSearchResults(uniqueGroups);
    }, [searchTerm, groups, students, statements, groupStudentMap, disciplinesMap, isOpen]);
    
    const getMatchInfo = (group) => {
        if (!isOpen || !group?.id) return { type: 'unknown', text: '' };
        
        const term = searchTerm.toLowerCase();
        const groupStudents = students.filter(s => s.groupId === group.id);
        
        const matchedDisciplines = (statements || [])
            .filter(s => s?.groupId === group.id)
            .filter(s => {
                const disciplineName = disciplinesMap[s.disciplineId] || '';
                return disciplineName.toLowerCase().includes(term);
            })
            .map(s => disciplinesMap[s.disciplineId] || '');
            
        if (isOpen) console.log('Найденные дисциплины:', matchedDisciplines);
    
        try {
            if (group.id?.toLowerCase()?.includes(term)) {
                if (isOpen) console.log('Найдено по номеру группы');
                return { type: 'group', text: group.id };
            }
    
            const matchedStudent = groupStudents.find(student => {
                const fullName = [
                    student?.lastName || '',
                    student?.firstName || '',
                    student?.patronymic || ''
                ].join(' ').toLowerCase();
                return fullName.includes(term);
            });
    
            if (matchedStudent) {
                if (isOpen) console.log('Найдено по студенту:', matchedStudent);
                return { 
                    type: 'student', 
                    text: [
                        matchedStudent?.lastName || '',
                        matchedStudent?.firstName || '',
                        matchedStudent?.patronymic || ''
                    ].join(' ').trim()
                };
            }
    
            if (matchedDisciplines.length > 0) {
                if (isOpen) console.log('Найдено по дисциплине:', matchedDisciplines);
                return { 
                    type: 'discipline', 
                    text: matchedDisciplines[0],
                    allDisciplines: matchedDisciplines
                };
            }
        } catch (error) {
            if (isOpen) console.error('Ошибка при определении совпадения:', error);
        }
    
        if (isOpen) console.log('Совпадений не найдено');
        return { type: 'unknown', text: '' };
    };

    if (!isOpen) return null; // Полностью не рендерим компонент, если закрыт

// Оставьте только это в return:
return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col transform transition-all duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`} style={{ height: '80vh', maxHeight: '600px' }}>
            {/* Шапка модального окна */}
            <div className="flex justify-between items-center p-4 bg-teal-600 text-white rounded-t-xl">
                <h3 className="text-lg font-semibold">Поиск группы</h3>
                <button onClick={onClose} className="text-white hover:text-teal-200">
                    <FaTimes />
                </button>
            </div>

            {/* Поле поиска */}
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

            {/* Список результатов */}
            <div className="flex-grow overflow-y-auto space-y-3 p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                        {searchTerm ? 'Ничего не найдено' : 'Загрузка данных...'}
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