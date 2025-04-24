import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllStatements, fetchAllTeachers, fetchAllDisciplines, getStatementStatistics } from "../../../utils/api";
import { useState, useMemo, useEffect } from "react";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';
import { useQueries } from "@tanstack/react-query";

const useStatementStatistics = (statements) => {
    const statsQueries = useQueries({
        queries: statements.map((statement) => ({
            queryKey: ['statementStats', Number(statement.id)],
            queryFn: () => getStatementStatistics(Number(statement.id)),
            staleTime: 5 * 60 * 1000,
            enabled: !isNaN(Number(statement.id)),
        }))
    });

    return statements.map((statement, index) => ({
        ...statement,
        stats: statsQueries[index]?.data || null,
    }));
};

const StatementStatisticsTable = ({ onCancel }) => {
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("statements_stats_filters");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem("statements_stats_filters", JSON.stringify(filters));
    }, [filters]);

    const [sortColumn, setSortColumn] = useState(() => localStorage.getItem('statements_stats_sortColumn') || null);
    const [sortDirection, setSortDirection] = useState(() => localStorage.getItem('statements_stats_sortDirection') || 'asc');

    const { data: statementsData = [], isLoading: isStatementsLoading } = useQuery({
        queryKey: ['statements'],
        queryFn: fetchAllStatements,
        staleTime: 5 * 60 * 1000,
    });

    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: fetchAllTeachers,
        staleTime: 10 * 60 * 1000,
    });

    const { data: disciplines = [] } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 10 * 60 * 1000,
    });

    const statementsWithStats = useStatementStatistics(statementsData);
    const idOptions = useMemo(
        () => statementsWithStats.map(s => s.id),
        [statementsWithStats]
    );
    
    const teacherOptions = useMemo(
        () => teachers.map(t => ({
            id: t.login,
            name: `${t.lastName} ${t.firstName?.[0] || ''}.${t.patronymic?.[0] || ''}.`
        })),
        [teachers]
    );
    
    const groupOptions = useMemo(
        () => [...new Set(statementsWithStats.map(s => s.groupId))],
        [statementsWithStats]
    );
    
    const semesterOptions = useMemo(
        () => [...new Set(statementsWithStats.map(s => s.semester))],
        [statementsWithStats]
    );
    
    const disciplineOptions = useMemo(
        () => disciplines.map(d => ({ id: d.id, name: d.name })),
        [disciplines]
    );
    
    const filteredStatements = useMemo(() => {
        return statementsWithStats.filter((statement) =>
            (!filters.id || String(statement.id) === String(filters.id)) &&
            (!filters.teacherLogin || statement.teacherLogin === filters.teacherLogin) &&
            (!filters.groupId || String(statement.groupId) === String(filters.groupId)) &&
            (!filters.semester || String(statement.semester) === String(filters.semester)) &&
            (!filters.disciplineId || statement.disciplineId === filters.disciplineId)
        );
    }, [filters, statementsWithStats]);

    const sortData = (data) => {
        if (!sortColumn) return data;
        return [...data].sort((a, b) => {
            const aVal = sortColumn.startsWith('stats.')
                ? a.stats?.[sortColumn.split('.')[1]] || 0
                : a[sortColumn];
            const bVal = sortColumn.startsWith('stats.')
                ? b.stats?.[sortColumn.split('.')[1]] || 0
                : b[sortColumn];

            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });
    };

    const sortedStatements = sortData(filteredStatements);

    const getTeacherName = (login) => {
        const t = teachers.find(t => t.login === login);
        return t ? `${t.lastName} ${t.firstName?.[0] || ''}.${t.patronymic?.[0] || ''}.` : "Неизвестный преподаватель";
    };

    const getDisciplineName = (id) => {
        return disciplines.find(d => d.id === id)?.name || "Неизвестная дисциплина";
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSort = (col) => {
        const dir = sortColumn === col && sortDirection === "asc" ? "desc" : "asc";
        localStorage.setItem('statements_stats_sortColumn', col);
        localStorage.setItem('statements_stats_sortDirection', dir);
        setSortColumn(col);
        setSortDirection(dir);
    };
    
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                Статистика ведомостей
            </h2>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                        <colgroup>
                            <col style={{ width: '85px' }}/> 
                            <col style={{ width: '110px' }}/>
                            <col style={{ width: '70px' }}/>
                            <col style={{ width: '60px' }}/>
                            <col style={{ width: '200px' }}/>
                            <col style={{ width: '75px' }}/>
                            <col style={{ width: '80px' }}/>
                            <col style={{ width: '80px' }}/>
                            <col style={{ width: '70px' }}/>
                        </colgroup>
                        <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                            <tr className="h-[40px]">
                                {[
                                    'id', 
                                    'teacherLogin', 
                                    'groupId', 
                                    'semester', 
                                    'disciplineId',
                                    'stats.overallAverage',
                                    'stats.attendancePercentage',
                                    'stats.certificationPercentage',
                                    'stats.certificationAverage'
                                ].map((col, i, arr) => (
                                    <th
                                        key={col}
                                        className={`px-4 text-left cursor-pointer ${
                                            i === 0 ? "rounded-tl-lg" : i === arr.length - 1 ? "rounded-tr-lg" : ""
                                        } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        onClick={() => handleSort(col)}
                                    >
                                        <div className="flex items-center h-full">
                                            {{
                                                id: "ID",
                                                teacherLogin: "Преподаватель",
                                                groupId: "Группа",
                                                semester: "Сем.",
                                                disciplineId: "Дисциплина",
                                                'stats.overallAverage': "Общая ср.",
                                                'stats.attendancePercentage': "Посещаемость",
                                                'stats.certificationPercentage': "Аттестация %",
                                                'stats.certificationAverage': "Аттестация"
                                            }[col]}
                                            {sortColumn === col && (
                                                <span className="ml-1">
                                                    {sortDirection === "asc" ? "▲" : "▼"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>

                            <tr className="h-[40px]">
                                {[
                                    { field: "id", options: idOptions },
                                    { field: "teacherLogin", options: teacherOptions, isTeacher: true },
                                    { field: "groupId", options: groupOptions },
                                    { field: "semester", options: semesterOptions },
                                    { field: "disciplineId", options: disciplineOptions, isDiscipline: true }
                                ].map(({ field, options, isTeacher, isDiscipline }, i, arr) => (
                                    <td key={field} className={`px-2 border-b-0 ${
                                        i === 0 ? "rounded-bl-lg" : ""
                                    }`}>
                                        <div className="flex items-center w-full space-x-2">
                                            <div className="flex-1">
                                                <SearchableSelect
                                                    options={options}
                                                    value={filters[field]}
                                                    onChange={(value) => handleFilterChange(field, value)}
                                                    placeholder="Фильтр"
                                                    formatOption={(option) => 
                                                        isTeacher ? option.name :
                                                        isDiscipline ? option.name :
                                                        option.toString()
                                                    }
                                                    getOptionValue={(option) => 
                                                        isTeacher ? option.id :
                                                        isDiscipline ? option.id :
                                                        option
                                                    }
                                                    className="w-full"
                                                    fontSize="sm"
                                                />
                                            </div>
                                            {filters[field] && (
                                                <button
                                                    className="text-gray-500 hover:text-red-600 transition px-1"
                                                    onClick={() => handleFilterChange(field, '')}
                                                    title="Очистить"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                ))}

                                {[1, 2, 3, 4].map((_, i, arr) => (
                                    <td key={`empty-${i}`} className={`px-2 border-b-0 ${
                                        i === arr.length - 1 ? "rounded-br-lg" : ""
                                    }`}></td>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isStatementsLoading ? (
                                <tr>
                                    <td colSpan="9" className="py-4 text-center">Загрузка данных...</td>
                                </tr>
                            ) : statementsWithStats.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-4 text-center">Нет данных о ведомостях</td>
                                </tr>
                            ) : (
                                sortedStatements.map((statement, index) => {
                                    const teacherFullName = getTeacherName(statement.teacherLogin);
                                    const disciplineName = getDisciplineName(statement.disciplineId);

                                    return (
                                        <tr
                                            key={statement.id || `statement-${index}`}
                                            className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0 hover:bg-gray-50 cursor-pointer`}
                                        >
                                            <td className="py-3 px-4 rounded-l-lg truncate">
                                                {statement.id}
                                            </td>

                                            <td className="py-3 px-4 truncate" title={teacherFullName}>
                                                {teacherFullName}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {statement.groupId}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {statement.semester}
                                            </td>

                                            <td className="py-3 px-4 truncate" title={disciplineName}>
                                                {disciplineName}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {statement.stats?.overallAverage?.toFixed(2) || '-'}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {statement.stats?.attendancePercentage ? `${statement.stats.attendancePercentage}%` : '-'}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {statement.stats?.certificationPercentage ? `${statement.stats.certificationPercentage}%` : '-'}
                                            </td>

                                            <td className="py-3 px-4 rounded-r-lg truncate">
                                                {statement.stats?.certificationAverage || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
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

export default StatementStatisticsTable;