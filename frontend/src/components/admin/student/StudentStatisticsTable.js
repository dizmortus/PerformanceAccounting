import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllStudents, fetchAllGroups, getStudentStatistics } from "../../../utils/api";
import { useState, useMemo, useEffect } from "react";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';
import { useQueries } from "@tanstack/react-query";

const useStudentStatistics = (students = [], semesterId) => {
    const statsQueries = useQueries({
        queries: Array.isArray(students) 
            ? students.map((student) => ({
                queryKey: ['studentStats', Number(student.id), semesterId],
                queryFn: () => getStudentStatistics(Number(student.id), semesterId),
                staleTime: 5 * 60 * 1000,
                enabled: !isNaN(Number(student.id)),
            }))
            : []
    });

    return Array.isArray(students) 
        ? students.map((student, index) => ({
            ...student,
            stats: statsQueries[index]?.data || null,
        }))
        : [];
};

const StudentStatisticsTable = ({ semesterId, onCancel }) => {
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("students_stats_filters");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem("students_stats_filters", JSON.stringify(filters));
    }, [filters]);

    const [sortColumn, setSortColumn] = useState(() => localStorage.getItem('students_stats_sortColumn') || null);
    const [sortDirection, setSortDirection] = useState(() => localStorage.getItem('students_stats_sortDirection') || 'asc');

    const { data: studentsData = [], isLoading: isStudentsLoading } = useQuery({
        queryKey: ['students'],
        queryFn: fetchAllStudents,
        staleTime: 5 * 60 * 1000,
    });
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 10 * 60 * 1000,
    });

    const studentsWithStats = useStudentStatistics(studentsData, semesterId);
    
    const studentOptions = useMemo(
        () => Array.isArray(studentsWithStats) 
            ? studentsWithStats.map(s => ({
                id: s.id,
                name: `${s.lastName} ${s.firstName} ${s.patronymic || ''}`
            }))
            : [],
        [studentsWithStats]
    );
    const groupOptions = useMemo(
        () => Array.isArray(groups) 
            ? groups.map(g => ({ id: g.id, name: g.name }))
            : [],
        [groups]
    );
    
    const filteredStudents = useMemo(() => {
        return studentsWithStats.filter((student) =>
            (!filters.studentId || String(student.id) === String(filters.studentId)) &&
            (!filters.groupId || String(student.groupId) === String(filters.groupId))
        );
    }, [filters, studentsWithStats]);

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

    const sortedStudents = sortData(filteredStudents);

    const getGroupName = (groupId) => {
        return groups.find(g => g.id === groupId)?.name || "Неизвестная группа";
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSort = (col) => {
        const dir = sortColumn === col && sortDirection === "asc" ? "desc" : "asc";
        localStorage.setItem('students_stats_sortColumn', col);
        localStorage.setItem('students_stats_sortDirection', dir);
        setSortColumn(col);
        setSortDirection(dir);
    };
    
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                Статистика студентов (Семестр {semesterId})
            </h2>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
    <colgroup>
        <col style={{ width: '200px' }} />
        <col style={{ width: '100px' }} />
        <col style={{ width: '80px' }} />
        <col style={{ width: '75px' }} />
        <col style={{ width: '80px' }} />
        <col style={{ width: '80px' }} />
    </colgroup>
                        <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                            <tr className="h-[40px]">
                                {[
                                    'student', 
                                    'groupId'
                                ].map((col, i, arr) => (
                                    <th
                                        key={col}
                                        className={`px-4 text-left cursor-pointer ${
                                            i === 0 ? "rounded-tl-lg" : ""
                                        } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        onClick={() => handleSort(col)}
                                    >
                                        <div className="flex items-center h-full">
                                            {{
                                                student: "Студент",
                                                groupId: "Группа"
                                            }[col]}
                                            {sortColumn === col && (
                                                <span className="ml-1">
                                                    {sortDirection === "asc" ? "▲" : "▼"}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                
                                {[
                                    'stats.attendancePercentage',
                                    'stats.overallAverage',
                                    'stats.certificationPercentage',
                                    'stats.certificationAverage'
                                ].map((col, i, arr) => (
                                    <th
                                        key={col}
                                        className={`px-4 text-left cursor-pointer ${
                                            i === arr.length - 1 ? "rounded-tr-lg" : ""
                                        } hover:bg-gray-400 border-b-0 transition-colors duration-200`}
                                        onClick={() => handleSort(col)}
                                        rowSpan="2"
                                    >
                                        <div className="flex flex-col items-center justify-center h-full">
                                            {{
                                                'stats.overallAverage': "Ср.балл",
                                                'stats.attendancePercentage': "Посещаемость",
                                                'stats.certificationPercentage': "Аттестация %",
                                                'stats.certificationAverage': "Ср.балл аттестации"
                                            }[col].split('<br>').map((line, i) => (
                                                <span key={i}>{line}</span>
                                            ))}
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
                                    { field: "studentId", options: studentOptions, isStudent: true },
                                    { field: "groupId", options: groupOptions }
                                ].map(({ field, options, isStudent }, i, arr) => (
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
                                                        isStudent ? option.name :
                                                        option.name
                                                    }
                                                    getOptionValue={(option) => 
                                                        isStudent ? option.id :
                                                        option.id
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
                            </tr>
                        </thead>
                        <tbody>
                            {isStudentsLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-center">Загрузка данных...</td>
                                </tr>
                            ) : studentsWithStats.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-4 text-center">Нет данных о студентах</td>
                                </tr>
                            ) : (
                                sortedStudents.map((student, index) => {
                                    const studentName = `${student.lastName} ${student.firstName} ${student.patronymic || ''}`;
                                    const groupName = getGroupName(student.groupId);

                                    return (
                                        <tr
                                            key={student.id || `student-${index}`}
                                            className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0 hover:bg-gray-50 cursor-pointer`}
                                        >
                                            <td className="py-3 px-4 rounded-l-lg truncate" title={studentName}>
                                                {studentName}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {groupName}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {student.stats?.attendancePercentage ? `${student.stats.attendancePercentage}%` : '-'}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {student.stats?.overallAverage?.toFixed(2) || '-'}
                                            </td>

                                            <td className="py-3 px-4 truncate">
                                                {student.stats?.certificationPercentage ? `${student.stats.certificationPercentage}%` : '-'}
                                            </td>

                                            <td className="py-3 px-4 rounded-r-lg truncate">
                                                {student.stats?.certificationAverage?.toFixed(2) || '-'}
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

export default StudentStatisticsTable;