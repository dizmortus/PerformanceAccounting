import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStatements, fetchAllTeachers, fetchAllDisciplines } from "../../../utils/api";
import EditStatementModal from "./EditStatementModal";
import CreateStatementModal from "./CreateStatementModal";
import { useState, useMemo, useCallback, useEffect } from "react";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';
import EmailSendModal from '../../EmailSendModal';
import SuccessModal from '../../SuccessModal';
const StatementTable = ({ onCancel }) => {
    const queryClient = useQueryClient();
    
    const [editingStatement, setEditingStatement] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedStatementId, setSelectedStatementId] = useState(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isEmailSendModalOpen, setIsEmailSendModalOpen] = useState(false);
    const [fileFormat, setFileFormat] = useState('docx'); 
// В части фильтров изменил:
const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
        const savedFilters = localStorage.getItem("statements_filters");
        return savedFilters ? JSON.parse(savedFilters) : {
            id: '',
            teacherLogin: '',
            groupId: '',
            semester: '',
            disciplineId: '',
            practiceHours: '',
            date: '',
            assessmentType: '',
            hasFile: ''
        };
    }
    return {
        id: '',
        teacherLogin: '',
        groupId: '',
        semester: '',
        disciplineId: '',
        practiceHours: '',
        date: '',
        assessmentType: '',
        hasFile: ''
    };
});
const handleSendByEmail = (format) => {
    setIsSuccessModalOpen(false);
    setIsEmailSendModalOpen(true);
    setFileFormat(format);
};

const closeEmailSendModal = () => {
    setIsEmailSendModalOpen(false);
};

    useEffect(() => {
        localStorage.setItem("statements_filters", JSON.stringify(filters));
    }, [filters]);

    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [sortColumn, setSortColumn] = useState(() => {
        return localStorage.getItem('statements_sortColumn') || null;
    });
    
    const [sortDirection, setSortDirection] = useState(() => {
        return localStorage.getItem('statements_sortDirection') || 'asc';
    });

    const handleSort = (column) => {
        let direction = "asc";
        if (sortColumn === column) {
            direction = sortDirection === "asc" ? "desc" : "asc";
        }
        
        localStorage.setItem('statements_sortColumn', column);
        localStorage.setItem('statements_sortDirection', direction);
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    const { 
        data: statementsData = [], 
        isLoading: isStatementsLoading,
        isError: isStatementsError,
        error: statementsError,
        refetch: refetchStatements
    } = useQuery({
        queryKey: ['statements'],
        queryFn: fetchAllStatements,
        staleTime: 5 * 60 * 1000,
    });

    const { 
        data: teachers = [], 
        isLoading: isTeachersLoading,
        isError: isTeachersError
    } = useQuery({
        queryKey: ['teachers'],
        queryFn: fetchAllTeachers,
        staleTime: 10 * 60 * 1000,
    });

    const { 
        data: disciplines = [], 
        isLoading: isDisciplinesLoading,
        isError: isDisciplinesError
    } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 10 * 60 * 1000,
    });

  

    const handleDownloadFile = (statementId) => {
        setSelectedStatementId(statementId);
        setIsSuccessModalOpen(true);
      };

    const getTeacherFullName = (teacherLogin, full = false) => {
        const teacher = teachers.find((t) => t.login === teacherLogin);
        if (!teacher) return "Неизвестный преподаватель";
        
        if (full) {
            return `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic || ''}`.trim();
        } else {
            const initials = `${teacher.firstName ? teacher.firstName[0] + ". " : ""}${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`;
            return `${teacher.lastName} ${initials}`;
        }
    };

    const getDisciplineName = (disciplineId) => {
        const discipline = disciplines.find((d) => d.id === disciplineId);
        return discipline ? discipline.name : "Неизвестная дисциплина";
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Нет даты";
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const sortData = (data, column, direction) => {
        if (!column) return data;
        return [...data].sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
    
            if (column === 'date') {
                valueA = valueA ? new Date(valueA).getTime() : 0;
                valueB = valueB ? new Date(valueB).getTime() : 0;
            } else if (column === 'creditUnits') {
                valueA = valueA || 0;
                valueB = valueB || 0;
            } else if (column === 'practiceHours') {
                valueA = valueA || 0;
                valueB = valueB || 0;
            } else {
                valueA = valueA || "";
                valueB = valueB || "";
            }
    
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const filteredStatements = useMemo(() => {
        if (!statementsData) return [];
        
        return statementsData.filter(statement => {
            return (
                (!filters.id || statement.id?.toString() === filters.id.toString()) &&
                (!filters.teacherLogin || statement.teacherLogin === filters.teacherLogin) &&
                (!filters.groupId || statement.groupId?.toString() === filters.groupId.toString()) &&
                (!filters.semester || statement.semester?.toString() === filters.semester.toString()) &&
                (!filters.disciplineId || statement.disciplineId === filters.disciplineId) &&
                (!filters.practiceHours || statement.practiceHours?.toString() === filters.practiceHours.toString()) &&
                (!filters.date || statement.date === filters.date) &&
                (!filters.assessmentType || statement.assessmentType === filters.assessmentType) &&
                (!filters.list || 
                    (filters.list === "yes" ? statement.list : !statement.list))
            );
        });
    }, [statementsData, filters]);
    

    const statements = sortData(filteredStatements, sortColumn, sortDirection);

    const handleEditStatement = (statement) => {
        setEditingStatement(statement);
    };

    const handleCloseModal = () => {
        setEditingStatement(null);
        queryClient.invalidateQueries(['statements']);
    };

    const handleCreateStatement = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        queryClient.invalidateQueries(['statements']);
    };

    const handleFilterChange = (column, value) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const getFilterOptions = useCallback((column) => {
        if (!statementsData) return [];
    
        return statementsData.filter(statement => {
            return Object.entries(filters).every(([key, value]) => {
                if (key === column || !value) return true;
    
                if (key === "teacherLogin" || key === "disciplineId") {
                    return statement[key] === value;
                }
    
                return statement[key]?.toString().includes(value.toString());
            });
        });
    }, [statementsData, filters]);

const dateOptions = useMemo(() => {
    const dateMap = new Map(); 
    getFilterOptions('date').forEach(statement => {
        if (statement.date) {
            const formatted = formatDate(statement.date);
 
            dateMap.set(statement.date, { 
                id: statement.date, 
                name: formatted 
            });
        }
    });
    // Преобразуем Map в массив и сортируем по дате
    return Array.from(dateMap.values()).sort((a, b) => 
        new Date(b.id) - new Date(a.id)
    );
}, [getFilterOptions]);

const fileOptions = useMemo(() => [
    { id: 'yes', name: 'Есть файл' },
    { id: 'no', name: 'Нет файла' }
], []);



    const idOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('id').forEach(statement => statement.id && values.add(statement.id));
        return Array.from(values).sort((a, b) => a - b);
    }, [getFilterOptions]);

    const teacherOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('teacherLogin').forEach(statement => statement.teacherLogin && values.add(statement.teacherLogin));
        return teachers
            .filter(teacher => values.has(teacher.login))
            .map(teacher => ({
                id: teacher.login,
                name: `${teacher.lastName} ${teacher.firstName?.[0]}.${teacher.patronymic?.[0]}.`
            }));
    }, [getFilterOptions, teachers]);

    const groupOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('groupId').forEach(statement => statement.groupId && values.add(statement.groupId));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const semesterOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('semester').forEach(statement => statement.semester && values.add(statement.semester));
        return Array.from(values).sort((a, b) => a - b);
    }, [getFilterOptions]);

    const disciplineOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('disciplineId').forEach(statement => statement.disciplineId && values.add(statement.disciplineId));
        return disciplines
            .filter(discipline => values.has(discipline.id))
            .map(discipline => ({
                id: discipline.id,
                name: discipline.name
            }));
    }, [getFilterOptions, disciplines]);

    const practiceHoursOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('practiceHours').forEach(statement => statement.practiceHours && values.add(statement.practiceHours));
        return Array.from(values).sort((a, b) => a - b);
    }, [getFilterOptions]);

    const assessmentTypeOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('assessmentType').forEach(statement => statement.assessmentType && values.add(statement.assessmentType));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const isLoading = isStatementsLoading || isTeachersLoading || isDisciplinesLoading;
    const isError = isStatementsError || isTeachersError || isDisciplinesError;

    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = [];
        
        if (sortColumn === columnName && extraWidthColumns.includes(columnName)) {
            return `${parseInt(baseWidth) + 11}px`;
        }
        return baseWidth;
    };

    const [cellContentModal, setCellContentModal] = useState({
        isOpen: false,
        title: "",
        content: ""
    });

    const handleCellClick = (title, content, teacherLogin = null) => {
        if (title === "Преподаватель" && teacherLogin) {
            const teacher = teachers.find(t => t.login === teacherLogin);
            if (teacher) {
                content = `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic || ''}`.trim();
            }
        }
        
        setCellContentModal({
            isOpen: true,
            title,
            content
        });
    };

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список ведомостей
                </h2>
    
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: getColumnWidth('id', '85px') }}/> 
                                <col style={{ width: getColumnWidth('teacherLogin', '110px') }}/>
                                <col style={{ width: getColumnWidth('groupId', '70px') }}/>
                                <col style={{ width: getColumnWidth('semester', '60px') }}/>
                                <col style={{ width: getColumnWidth('disciplineId', '200px') }}/>
                                <col style={{ width: '60px' }}/>
                                <col style={{ width: getColumnWidth('date', '75px') }}/>
                                <col style={{ width: getColumnWidth('assessmentType', '80px') }}/>
                                <col style={{ width: getColumnWidth('list', '60px') }}/>
                                <col style={{ width: '40px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                {/* Заголовки столбцов */}
                                <tr className="h-[40px]">
                                    {["id", "teacherLogin", "groupId", "semester", "disciplineId", "practiceHours", "date", "assessmentType", "list"].map((col, i) => (
                                        <th
                                            key={col}
                                            className={`px-4 text-left cursor-pointer ${
                                                i === 0 ? "rounded-tl-lg" : ""
                                            } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        >
                                            <div className="flex items-center h-full" onClick={() => handleSort(col)}>
                                                {{
                                                    id: "ID",
                                                    teacherLogin: "Преподаватель",
                                                    groupId: "Группа",
                                                    semester: "Сем.",
                                                    disciplineId: "Дисциплина",
                                                    practiceHours: "Часы",
                                                    date: "Дата",
                                                    assessmentType: "Тип",
                                                    list: "Файл"
                                                }[col]}{" "}
                                                {sortColumn === col && (sortDirection === "asc" ? "▲" : "▼")}
                                            </div>
                                        </th>
                                    ))}
    
                                    {/* Объединенная ячейка для кнопки создания */}
                                    <th className="px-2 text-center border-b-0 rounded-tr-lg rounded-br-lg" colSpan="1" rowSpan="2">
                                        <div className="flex justify-center">
                                            <button
                                                className="h-[40px] w-[40px] bg-teal-500 text-white rounded-lg shadow hover:bg-teal-600 transition flex items-center justify-center"
                                                onClick={handleCreateStatement}
                                                title="Создать"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </th>
                                </tr>
    
                                {/* Фильтры под заголовками */}
                                <tr className="h-[40px]">
                                    {[
                                        { field: "id", options: idOptions },
                                        { field: "teacherLogin", options: teacherOptions, isTeacher: true },
                                        { field: "groupId", options: groupOptions },
                                        { field: "semester", options: semesterOptions },
                                        { field: "disciplineId", options: disciplineOptions, isDiscipline: true },
                                        { field: "practiceHours", options: practiceHoursOptions },
                                        { field: "date", options: dateOptions, isDate: true },
                                        { field: "assessmentType", options: assessmentTypeOptions },
                                        { field: "list", options: fileOptions, isFile: true }
                                    ].map(({ field, options, isTeacher, isDiscipline, isDate, isFile }, i) => (
                                        <td key={field} className={`px-2 border-b-0 ${i === 0 ? "rounded-bl-lg" : ""}`}>
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
                                                            isDate ? option.name :
                                                            isFile ? option.name :
                                                            option.toString()
                                                        }
                                                        getOptionValue={(option) => 
                                                            isTeacher ? option.id :
                                                            isDiscipline ? option.id :
                                                            isDate ? option.id :
                                                            isFile ? option.id :
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
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="10" className="py-4 text-center">Загрузка...</td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan="10" className="py-4 text-center text-red-500">
                                            Ошибка загрузки: {statementsError?.message}
                                        </td>
                                    </tr>
                                ) : statements.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="py-4 text-center">Нет данных о ведомостях</td>
                                    </tr>
                                ) : (
                                    statements.map((statement, index) => {
                                        const teacherFullName = getTeacherFullName(statement.teacherLogin);
                                        const classTeacherName = statement.classTeacherLogin 
                                            ? getTeacherFullName(statement.classTeacherLogin) 
                                            : null;
                                        const disciplineName = getDisciplineName(statement.disciplineId);
                                        const formattedDate = formatDate(statement.date);
                                        const hoursAndCredits = `${statement.practiceHours || 0}/${statement.creditUnits || 0} з.е.`;
    
                                        return (
                                            <tr
                                                key={statement.id || `statement-${index}`}
                                                className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0`}
                                            >
                                                {/* ID */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                                                    title={statement.id}
                                                    onClick={() => handleCellClick("ID", statement.id)}
                                                >
                                                    {statement.id}
                                                </td>
                                                
                                                {/* Преподаватель */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={teacherFullName}
                                                    onClick={() => handleCellClick("Преподаватель", teacherFullName, statement.teacherLogin)}
                                                >
                                                    <div className="truncate">{teacherFullName}</div>
                                                </td>
                                                
                                                {/* Группа */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={statement.groupId}
                                                    onClick={() => handleCellClick("Группа", statement.groupId)}
                                                >
                                                    {statement.groupId}
                                                </td>
                                                
                                                {/* Семестр */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={statement.semester}
                                                    onClick={() => handleCellClick("Семестр", statement.semester)}
                                                >
                                                    {statement.semester}
                                                </td>
                                                
                                                {/* Дисциплина */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={disciplineName}
                                                    onClick={() => handleCellClick("Дисциплина", disciplineName)}
                                                >
                                                    {disciplineName}
                                                </td>
                                                
                                                {/* Часы / З.Е. */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={hoursAndCredits}
                                                    onClick={() => handleCellClick("Часы", hoursAndCredits)}
                                                >
                                                    {hoursAndCredits}
                                                </td>
                                                
                                                {/* Дата */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={formattedDate}
                                                    onClick={() => handleCellClick("Дата", formattedDate)}
                                                >
                                                    {formattedDate}
                                                </td>
                                                
                                                {/* Тип */}
                                                <td
                                                    className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                    title={statement.assessmentType}
                                                    onClick={() => handleCellClick("Тип", statement.assessmentType)}
                                                >
                                                    {statement.assessmentType}
                                                </td>
                                                
                                                {/* Файл */}
{/* Файл */}
<td
    className="py-2 px-2 truncate"
    title={statement.list || 'Нет файла'}
    onClick={() => statement.list && handleCellClick("Файл", statement.list)}
>
    {statement.list ? (
        <button
            className="h-[40px] w-full px-2 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
            onClick={(e) => {
                e.stopPropagation();
                handleDownloadFile(statement.id);
            }}
        >
            Файл
        </button>
    ) : (
        "Нет файла"
    )}
</td>
                                                
                                                {/* Действия */}
                                                <td 
                                                    className="py-2 px-2 text-center rounded-r-lg truncate relative hover:bg-gray-50 cursor-pointer"
                                                    title="Редактировать"
                                                    onClick={() => handleEditStatement(statement)}
                                                >
                                                    <div className="flex justify-center">
                                                        <button
                                                            className="h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditStatement(statement);
                                                            }}
                                                            aria-label="Редактировать"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-5 w-5"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    
            {/* Модальные окна */}
            {editingStatement && <EditStatementModal statement={editingStatement} onClose={handleCloseModal} />}
            {isCreateModalOpen && <CreateStatementModal onClose={handleCloseCreateModal} />}
            {isErrorModalOpen && (
                <WarningModal 
                    isOpen={isErrorModalOpen}
                    onClose={() => setIsErrorModalOpen(false)}
                    warningText={errorMessage}
                />
            )}
            {cellContentModal.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md w-full">
                        <h2 className="text-xl font-semibold mb-4">{cellContentModal.title}</h2>
                        <div className="text-gray-700 mb-4 p-4 bg-gray-100 rounded break-words">
                            {cellContentModal.content}
                        </div>
                        <button
                            onClick={() => setCellContentModal({...cellContentModal, isOpen: false})}
                            className="w-36 px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                        >
                            ОК
                        </button>
                    </div>
                </div>
            )}
<SuccessModal
  isOpen={isSuccessModalOpen}
  onClose={() => setIsSuccessModalOpen(false)}
  onSendByEmail={handleSendByEmail}
  statementId={selectedStatementId}
  successText={`Ведомость ${selectedStatementId}`}
/>
            
            <EmailSendModal
                isOpen={isEmailSendModalOpen}
                onClose={closeEmailSendModal}
                statementId={selectedStatementId}
                fileFormat={fileFormat}
            />
        </>
    );
};

export default StatementTable;