import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllGroups, fetchAllStatements, getGroupStatistics, fetchAllDisciplines, exportGroupStatisticsToExcel } from "../../../utils/api";
import { useState, useMemo, useEffect, useCallback } from "react";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const GroupStatisticsTable = ({ onCancel }) => {
    const queryClient = useQueryClient();

    // Состояние фильтров
    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("group_stats_filters");
            return saved ? JSON.parse(saved) : {
                groupId: null,
                semester: null,
                statementId: null
            };
        }
        return {
            groupId: null,
            semester: null,
            statementId: null
        };
    });

    useEffect(() => {
        localStorage.setItem("group_stats_filters", JSON.stringify(filters));
    }, [filters]);

    // Загрузка данных
    const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 10 * 60 * 1000,
    });

    const { data: statements = [], isLoading: isStatementsLoading } = useQuery({
        queryKey: ['statements'],
        queryFn: fetchAllStatements,
        staleTime: 5 * 60 * 1000,
    });

    // Загрузка дисциплин
    const { data: disciplines = [], isLoading: isDisciplinesLoading } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 10 * 60 * 1000,
    });

    // Получение статистики
    const { data: statsData, isLoading: isStatsLoading } = useQuery({
        queryKey: ['groupStats', filters.groupId, filters.semester, filters.statementId],
        queryFn: () => getGroupStatistics(
            filters.groupId,
            filters.semester,
            filters.statementId
        ),
        enabled: !!filters.groupId,
        staleTime: 5 * 60 * 1000,
    });

    // Подготовка данных для фильтров
    const groupOptions = useMemo(() => {
        return groups.map(group => ({
            id: String(group.id),
            name: String(group.id)
        }));
    }, [groups]);

    // Получаем уникальные семестры для выбранной группы
    const availableSemesters = useMemo(() => {
        if (!filters.groupId) return [];
        
        const groupStatements = statements.filter(s => s.groupId === filters.groupId);
        const uniqueSemesters = [...new Set(groupStatements.map(s => s.semester))];
        
        return uniqueSemesters.sort((a, b) => a - b);
    }, [statements, filters.groupId]);

    // Формируем опции для семестров на основе доступных семестров
    const semesterOptions = useMemo(() => {
        const baseOptions = [
            { id: null, name: "Все семестры" }
        ];
        
        return [
            ...baseOptions,
            ...availableSemesters.map(semester => ({
                id: semester,  // Убедимся, что это число
                name: `${semester}`
            }))
        ];
    }, [availableSemesters]);

    // Функция для получения названия дисциплины по ID
    const getDisciplineName = useCallback((disciplineId) => {
        const discipline = disciplines.find(d => d.id === disciplineId);
        return discipline?.name || 'Неизвестная дисциплина';
    }, [disciplines]);
    
    // Формируем опции для ведомостей с учетом выбранных группы и семестра
    const statementOptions = useMemo(() => {
        const baseOptions = [
            { id: null, name: "Все ведомости" }
        ];
    
        if (!filters.groupId) return baseOptions;
    
        const filteredStatements = statements.filter(s => 
            String(s.groupId) === String(filters.groupId) &&
            (!filters.semester || s.semester === filters.semester)
        );
    
        console.log('Filtered statements:', filteredStatements); // Добавим лог
    
        return [
            ...baseOptions,
            ...filteredStatements.map(s => ({
                id: String(s.id), // Явно преобразуем ID в строку
                name: `${getDisciplineName(s.disciplineId)} - ${s.assessmentType}`,
                semester: s.semester
            }))
        ];
    }, [statements, filters.groupId, filters.semester, getDisciplineName]);
    
    // Обработчик изменения ведомости
    const handleStatementChange = (value) => {
        const newStatementId = value ? value : null;
        
        console.log('Looking for statement with ID:', newStatementId);
        const selectedStatement = newStatementId 
            ? statements.find(s => String(s.id) === String(newStatementId)) 
            : null;
        
        console.log('Found statement:', selectedStatement);
        
        setFilters(prev => {
            const shouldUpdateSemester = selectedStatement && (!prev.semester || prev.semester !== selectedStatement.semester);
            
            return {
                ...prev,
                statementId: newStatementId,
                ...(shouldUpdateSemester ? { semester: selectedStatement.semester } : {})
            };
        });
    };

    // Остальные обработчики изменений
    const handleGroupChange = (value) => {
        setFilters(prev => ({
            ...prev,
            groupId: value ? value : null,
            statementId: null,
            semester: null
        }));
    };

    const handleSemesterChange = (value) => {
        setFilters(prev => ({
            ...prev,
            semester: value ? Number(value) : null,
            statementId: null
        }));
    };

    useEffect(() => {
        if (statsData) {
            console.log('Статистика по группе:', statsData);
            console.log('Ведомость:', filters.statementId );
        }
    }, [filters.statementId, statsData]);

    // Ошибки
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-2xl shadow-xl flex flex-col" 
             style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
            
            {/* Заголовок */}
            {/* <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800">
                    Статистика по группам
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Подробная успеваемость студентов
                </p>
            </div> */}
    
        {/* Фильтры */}
<div className="flex gap-4 mb-6 w-full bg-gray-50 p-4 rounded-xl border border-gray-200">
    <div className="w-[200px]"> {/* Фиксированная ширина для группы */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
        <SearchableSelect
            options={groupOptions}
            value={filters.groupId ? String(filters.groupId) : null}
            onChange={handleGroupChange}
            placeholder="Выберите группу"
            formatOption={(option) => option.name}
            getOptionValue={(option) => option.id}
            className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
    </div>
    
    <div className="w-[200px]"> {/* Фиксированная ширина для семестра */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Семестр</label>
        <SearchableSelect
            options={semesterOptions}
            value={filters.semester !== null ? Number(filters.semester) : null}
            onChange={handleSemesterChange}
            placeholder="Выберите семестр"
            disabled={!filters.groupId}
            formatOption={(option) => option.name}
            getOptionValue={(option) => option.id}
            className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
    </div>
    
    <div className="flex-1 min-w-0"> {/* Оставшийся доступный размер для ведомости */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Ведомость</label>
        <SearchableSelect
            options={statementOptions}
            value={filters.statementId ? String(filters.statementId) : null}
            onChange={handleStatementChange}
            placeholder="Выберите ведомость"
            disabled={!filters.groupId}
            formatOption={(option) => option.name}
          getOptionValue={(option) => option.id === null ? null : String(option.id)}
            className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
    </div>

<div className="flex items-end"> {/* Обертка для выравнивания кнопки по нижнему краю */}
<button
    onClick={async () => {
        if (!filters.groupId) {
            setErrorMessage("Необходимо выбрать группу для экспорта");
            setIsErrorModalOpen(true);
            return;
        }
        try {
            const blob = await exportGroupStatisticsToExcel(
                filters.groupId,
                filters.semester,
                filters.statementId
            );

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            let fileName = `Статистика_группы_${filters.groupId}`;
            if (filters.semester) fileName += `_семестр_${filters.semester}`;
            if (filters.statementId) fileName += `_ведомость_${filters.statementId}`;
            fileName += '.xlsx';

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setErrorMessage(`Ошибка при экспорте: ${error.message}`);
            setIsErrorModalOpen(true);
        }
    }}
    className={`h-[42px] px-4 flex items-center gap-2 rounded-lg shadow-md transition cursor-pointer
        ${isStatsLoading 
            ? 'bg-gray-300 cursor-wait' 
            : 'bg-[#217346] hover:bg-[#1a5f38] text-white border border-[#1a5f38]'}
        `}
    disabled={isStatsLoading || !filters.groupId}
>
    {/* Иконка Excel */}
    <div className="relative w-5 h-5">
        <div className="absolute inset-0 bg-white border border-[#217346] rounded-sm shadow-sm flex items-center justify-center">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px] p-[1px]">
                {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} className={`w-full h-full ${idx === 4 ? 'bg-white' : 'bg-[#217346]'}`} />
                ))}
            </div>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-[#217346] text-white text-[8px] font-bold px-[2px] py-[1px] rounded-sm shadow-md">
            X
        </div>
    </div>
    {isStatsLoading ? (
        <span className="text-base">Экспорт...</span>
    ) : (
        <span className="text-base">Экспорт</span>
    )}
</button>
</div>
            
</div>
    
            {/* Таблица */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm relative">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-sm text-gray-700">
                        <thead className="sticky top-0 z-20 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold first:rounded-tl-xl">Студент</th>
                                <th className="px-6 py-3 text-left font-semibold">Посещаемость</th>
                                <th className="px-6 py-3 text-left font-semibold">Пропуски</th>
                                <th className="px-6 py-3 text-left font-semibold">Ср. текущая оценка</th>
                                <th className="px-6 py-3 text-left font-semibold">Аттестация</th>
                                <th className="px-6 py-3 text-left font-semibold last:rounded-tr-xl">
                                    {filters.statementId ? "Аттест. оценка" : "Ср. аттест. оценка"}
                                </th>
                            </tr>
                        </thead>
    
                        <tbody className="divide-y divide-gray-200">
                            {(isGroupsLoading || isStatementsLoading || isDisciplinesLoading || isStatsLoading) ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center space-x-2">
                                            <svg className="animate-spin h-5 w-5 text-teal-500" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Загрузка данных...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : !filters.groupId ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <svg className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Выберите группу для отображения статистики
                                        </div>
                                    </td>
                                </tr>
                            ) : statsData?.students?.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Нет данных для отображения
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {statsData?.students?.map((student, index) => (
                                        <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-teal-100 text-teal-800 mr-3">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <div className="font-medium">
                                                            {student.lastName} {student.firstName?.[0]}.{student.patronymic?.[0]}.
                                                        </div>
                                                        <div className="text-xs text-gray-500">ID: {student.studentId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.attendancePercentage !== null && student.attendancePercentage !== undefined ? (
                                                    <div className="flex items-center">
                                                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                            <div
                                                                className="bg-teal-500 h-2 rounded-full"
                                                                style={{ width: `${student.attendancePercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {`${student.attendancePercentage}%`}
                                                        </span>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.missedLessons !== null && student.missedLessons !== undefined ? (
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        student.missedLessons === 0 ? 'bg-green-100 text-green-800' :
                                                        student.missedLessons <= 3 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {student.missedLessons}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.averageGrade !== null && student.averageGrade !== undefined ? (
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        student.averageGrade >= 4.5 ? 'bg-green-100 text-green-800' :
                                                        student.averageGrade >= 3.5 ? 'bg-teal-100 text-teal-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {student.averageGrade.toFixed(2)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
    {student.certificationPercentage !== null && student.certificationPercentage !== undefined ? (
       filters.statementId && filters.statementId !== 'null' ? ( // Явная проверка на null
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                student.certificationPercentage === 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
                {student.certificationPercentage === 100 ? 'Аттестован' : 'Не аттестован'}
            </span>
        ) : (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                student.certificationPercentage >= 90 ? 'bg-green-100 text-green-800' :
                student.certificationPercentage >= 70 ? 'bg-teal-100 text-teal-800' :
                'bg-red-100 text-red-800'
            }`}>
                {`${student.certificationPercentage}%`}
            </span>
        )
    ) : '-'}
</td>

                                            <td className="px-6 py-4">
                                                {student.certificationGrade !== null && student.certificationGrade !== undefined ? (
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        student.certificationGrade >= 4.5 ? 'bg-green-100 text-green-800' :
                                                        student.certificationGrade >= 3.5 ? 'bg-teal-100 text-teal-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {student.certificationGrade}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {/* Средние значения по группе */}
                                    {statsData && (
  <tr className="bg-teal-50 font-semibold sticky bottom-[-1px] border-t-2 border-teal-100">
        <td className="px-6 py-3 text-teal-800">Среднее по группе</td>
        <td className="px-6 py-3 text-teal-800">
            {statsData.groupAttendance !== null && statsData.groupAttendance !== undefined ? (
                <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                            className="bg-teal-500 h-2 rounded-full"
                            style={{ width: `${statsData.groupAttendance}%` }}
                        ></div>
                    </div>
                    <span className="text-sm font-medium">
                        {`${statsData.groupAttendance}%`}
                    </span>
                </div>
            ) : '-'}
        </td>
        <td className="px-6 py-3 text-teal-800">
            {statsData.groupMissedLessons !== null && statsData.groupMissedLessons !== undefined ? (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statsData.groupMissedLessons === 0 ? 'bg-green-100 text-green-800' :
                    statsData.groupMissedLessons <= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {statsData.groupMissedLessons.toFixed(1)}
                </span>
            ) : '-'}
        </td>
        <td className="px-10 py-3 text-teal-800">
            {statsData.groupAverage !== null && statsData.groupAverage !== undefined
                ? statsData.groupAverage.toFixed(2)
                : '-'}
        </td>
        <td className="px-9 py-3 text-teal-800">
            {statsData.groupCertificationPercentage !== null && statsData.groupCertificationPercentage !== undefined
                ? `${statsData.groupCertificationPercentage}%`
                : '-'}
        </td>
        <td className="px-9 py-3 text-teal-800">
            {statsData.groupCertificationAverage !== null && statsData.groupCertificationAverage !== undefined
                ? statsData.groupCertificationAverage.toFixed(2)
                : '-'}
        </td>
    </tr>
)}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
    
            <WarningModal 
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                warningText={errorMessage}
            />
        </div>
    );
};

export default GroupStatisticsTable;