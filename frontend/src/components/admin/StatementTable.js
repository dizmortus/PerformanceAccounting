import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStatements, fetchAllTeachers, fetchAllDisciplines, downloadStatement } from "../../utils/api";
import EditStatementModal from "./EditStatementModal";
import CreateStatementModal from "./CreateStatementModal";
import { useState } from "react";
import WarningModal from '../WarningModal';

const StatementTable = ({ onCancel }) => {
    const queryClient = useQueryClient();
    const [editingStatement, setEditingStatement] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

    // // We may not need these separate queries anymore since the data comes with the statements
    // const { 
    //     data: teachers = [], 
    //     isLoading: isTeachersLoading,
    //     isError: isTeachersError
    // } = useQuery({
    //     queryKey: ['teachers'],
    //     queryFn: fetchAllTeachers,
    //     staleTime: 10 * 60 * 1000,
    //     enabled: false // Disable since we get teacher data with statements
    // });

    // const { 
    //     data: disciplines = [], 
    //     isLoading: isDisciplinesLoading,
    //     isError: isDisciplinesError
    // } = useQuery({
    //     queryKey: ['disciplines'],
    //     queryFn: fetchAllDisciplines,
    //     staleTime: 10 * 60 * 1000,
    //     enabled: false // Disable since we get discipline data with statements
    // });

    const downloadMutation = useMutation({
        mutationFn: downloadStatement,
        useErrorBoundary: false,
        onError: (error, statementId) => {
            if (!error.silent && process.env.NODE_ENV === 'development') {
                console.warn('Download error:', error.message);
            }
            
            if (error.message.includes("не найден на сервере")) {
                queryClient.invalidateQueries(['statements']);
            }
            
            setErrorMessage(error.message);
            setIsErrorModalOpen(true);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['statements']);
        },
        meta: { suppressErrorLogging: true }
    });

    const handleDownloadFile = (statementId) => {
        downloadMutation.mutate(statementId);
    };

    // Modified to use data from statement directly
    const getTeacherFullName = (statement) => {
        if (statement.teacherName) {
            return statement.teacherName;
        }
        return "Неизвестный преподаватель";
    };

    // Modified to use data from statement directly
    const getDisciplineName = (statement) => {
        if (statement.disciplineName) {
            return statement.disciplineName;
        }
        return "Неизвестная дисциплина";
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
            } else if (column === 'practiceHours' || column === 'creditUnits') {
                valueA = valueA || 0;
                valueB = valueB || 0;
            } else if (column === 'teacherLogin') {
                valueA = getTeacherFullName(a) || "";
                valueB = getTeacherFullName(b) || "";
            } else if (column === 'disciplineId') {
                valueA = getDisciplineName(a) || "";
                valueB = getDisciplineName(b) || "";
            } else {
                valueA = valueA || "";
                valueB = valueB || "";
            }

            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

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

    const statements = sortData(statementsData, sortColumn, sortDirection);
    const isLoading = isStatementsLoading; // Removed teachers and disciplines loading states
    const isError = isStatementsError; // Removed teachers and disciplines error states

    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = ['teacherLogin', 'semester', 'practiceHours', 'creditUnits'];
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

   // Модифицированная функция для форматирования имени преподавателя
   const formatTeacherName = (teacherName, full = false) => {
    if (!teacherName) return "Неизвестный преподаватель";
    
    if (full) {
        return teacherName; // Возвращаем полное имя
    }
    
    // Форматируем в "Фамилия И.О."
    const parts = teacherName.split(' ');
    if (parts.length < 2) return teacherName;
    
    const lastName = parts[0];
    const firstName = parts[1] ? `${parts[1][0]}.` : '';
    const patronymic = parts[2] ? `${parts[2][0]}.` : '';
    
    return `${lastName} ${firstName}${patronymic}`.trim();
};

// Модифицированная функция handleCellClick для преподавателя
const handleCellClick = (title, content, statement = null) => {
    if (title === "Преподаватель" && statement) {
        content = statement.teacherName; // Полное ФИО
    }
    
    setCellContentModal({
        isOpen: true,
        title,
        content
    });
};
     // Format hours and credit units as "65/2 з.е."
     const formatHoursAndUnits = (hours, units) => {
        return `${hours || 0}/${units || 0} з.е.`;
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
                                <col style={{ width: getColumnWidth('id', '75px') }}/> 
                                <col style={{ width: getColumnWidth('teacherLogin', '110px') }}/>
                                <col style={{ width: getColumnWidth('groupId', '70px') }}/>
                                <col style={{ width: getColumnWidth('semester', '65px') }}/>
                                <col style={{ width: getColumnWidth('disciplineId', '150px') }}/>
                                <col style={{ width: getColumnWidth('hoursAndUnits', '80px') }}/>
                                <col style={{ width: getColumnWidth('date', '75px') }}/>
                                <col style={{ width: getColumnWidth('assessmentType', '80px') }}/>
                                <col style={{ width: getColumnWidth('list', '75px') }}/>
                                <col style={{ width: '85px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                <tr>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer rounded-l-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("id")}
                                    >
                                        ID {sortColumn === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("teacherLogin")}
                                    >
                                        Преподаватель {sortColumn === "teacherLogin" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("groupId")}
                                    >
                                        Группа {sortColumn === "groupId" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("semester")}
                                    >
                                        Семестр {sortColumn === "semester" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("disciplineId")}
                                    >
                                        Дисциплина (практика) {sortColumn === "disciplineId" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("practiceHours")}
                                    >
                                        Часы {sortColumn === "practiceHours" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("date")}
                                    >
                                        Дата {sortColumn === "date" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("assessmentType")}
                                    >
                                        Тип {sortColumn === "assessmentType" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("list")}
                                    >
                                        Файл {sortColumn === "list" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th className="py-3 px-4 text-center border-b-0 rounded-r-lg ">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {statements.map((statement, index) => (
                                    <tr
                                        key={statement.id || `statement-${index}`}
                                        className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0`}
                                    >
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate relative group"
                                            onClick={() => handleCellClick("ID", statement.id)}
                                            title={statement.id}
                                        >
                                            {statement.id}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.id}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                            onClick={() => handleCellClick("Преподаватель", statement.teacherName, statement)}
                            title={statement.teacherName} // Подсказка с полным ФИО
                        >
                            {formatTeacherName(statement.teacherName)} {/* Сокращенное отображение */}
                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                {statement.teacherName} {/* Полное ФИО в подсказке */}
                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                            </div>
                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Группа", statement.groupId)}
                                            title={statement.groupId}
                                        >
                                            {statement.groupId}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.groupId}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Семестр", statement.semester)}
                                            title={statement.semester}
                                        >
                                            {statement.semester}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.semester}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Дисциплина", statement.disciplineName)}
                                            title={statement.disciplineName}
                                        >
                                            {statement.disciplineName}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.disciplineName}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Часы", 
                                                `Часы: ${statement.practiceHours}\nЗ.Е.: ${statement.creditUnits}`)}
                                            title={`Часы: ${statement.practiceHours}\nЗ.Е.: ${statement.creditUnits}`}
                                        >
                                            {formatHoursAndUnits(statement.practiceHours, statement.creditUnits)}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-pre">
                                                Часы: {statement.practiceHours}
                                                <br />
                                                З.Е.: {statement.creditUnits}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Дата", formatDate(statement.date))}
                                            title={formatDate(statement.date)}
                                        >
                                            {formatDate(statement.date)}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {formatDate(statement.date)}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate relative group"
                                            onClick={() => handleCellClick("Тип", statement.assessmentType)}
                                            title={statement.assessmentType}
                                        >
                                            {statement.assessmentType}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.assessmentType}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td
                                            className="py-2 px-2 truncate relative group"
                                            onClick={() => statement.list && handleCellClick("Файл", statement.list)}
                                            title={statement.list || "Нет файла"}
                                        >
                                            {statement.list ? (
                                                <button
                                                    className="h-[40px] px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition truncate w-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadFile(statement.id);
                                                    }}
                                                >
                                                    Скачать
                                                </button>
                                            ) : (
                                                "Нет файла"
                                            )}
                                            <div className="absolute z-50 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                                                {statement.list || "Нет файла"}
                                                <div className="absolute w-2 h-2 bg-gray-800 rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 text-center rounded-r-lg truncate">
                                            <button
                                                className="h-[40px] px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition truncate w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditStatement(statement);
                                                }}
                                            >
                                                Изменить
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
    
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        className="h-[40px] px-6 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                        onClick={handleCreateStatement}
                    >
                        Создать ведомость
                    </button>
                </div>
            </div>
    
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
                        <div className="text-gray-700 mb-4 p-4 bg-gray-100 rounded break-words whitespace-pre-line">
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
        </>
    );
};

export default StatementTable;