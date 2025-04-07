import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllStatements, fetchAllTeachers, fetchAllDisciplines, downloadStatement } from "../utils/api";
import EditStatementModal from "./EditStatementModal";
import CreateStatementModal from "./CreateStatementModal";
import { useState } from "react";
import WarningModal from './WarningModal';

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
        
        // Сохраняем параметры в Local Storage
        localStorage.setItem('statements_sortColumn', column);
        localStorage.setItem('statements_sortDirection', direction);
        
        setSortColumn(column);
        setSortDirection(direction);
    };
    // Загрузка данных с использованием React Query
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

    // Мутация для скачивания файла
    const downloadMutation = useMutation({
        mutationFn: downloadStatement,
        useErrorBoundary: false,
        onError: (error) => {
            // Проверяем флаг silent, чтобы не логировать "тихие" ошибки
            if (!error.silent && process.env.NODE_ENV === 'development') {
                console.warn('Download error:', error.message);
            }
            setErrorMessage(error.message);
            setIsErrorModalOpen(true);
        },
        // Отключаем стандартное логирование ошибок React Query
        meta: { suppressErrorLogging: true }
    });
    
    const handleDownloadFile = (statementId) => {
        downloadMutation.mutate(statementId);
    };


    const getTeacherFullName = (teacherLogin) => {
        const teacher = teachers.find((t) => t.login === teacherLogin);
        if (!teacher) return "Неизвестный преподаватель";
        const { lastName, firstName, patronymic } = teacher;
        const initials = `${firstName ? firstName[0] + ". " : ""}${patronymic ? patronymic[0] + "." : ""}`;
        return `${lastName} ${initials}`;
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



    // Сортируем данные
    const statements = sortData(statementsData, sortColumn, sortDirection);
    // Обновляем проверку ошибок
    const isLoading = isStatementsLoading || isTeachersLoading || isDisciplinesLoading;
    const isError = isStatementsError || isTeachersError || isDisciplinesError;

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", resize: "horizontal", overflow: "auto" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список ведомостей
                </h2>
    
                <div className="flex-1 overflow-auto mb-4">
                    <table className="w-full text-sm text-gray-900 border-collapse">
                        <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                            <tr>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer rounded-l-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("id")}
                                    style={{ minWidth: "50px", width: "1%" }}
                                >
                                    ID {sortColumn === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("teacherLogin")}
                                    style={{ minWidth: "150px", width: "auto" }}
                                >
                                    Преподаватель {sortColumn === "teacherLogin" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("disciplineId")}
                                    style={{ minWidth: "120px", width: "auto" }}
                                >
                                    Дисциплина {sortColumn === "disciplineId" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("groupId")}
                                    style={{ minWidth: "80px", width: "auto" }}
                                >
                                    Группа {sortColumn === "groupId" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("date")}
                                    style={{ minWidth: "100px", width: "auto" }}
                                >
                                    Дата {sortColumn === "date" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("practiceHours")}
                                    style={{ minWidth: "60px", width: "auto" }}
                                >
                                    Часы {sortColumn === "practiceHours" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("semester")}
                                    style={{ minWidth: "80px", width: "auto" }}
                                >
                                    Семестр {sortColumn === "semester" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("assessmentType")}
                                    style={{ minWidth: "80px", width: "auto" }}
                                >
                                    Тип {sortColumn === "assessmentType" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("list")}
                                    style={{ minWidth: "80px", width: "auto" }}
                                >
                                    Файл {sortColumn === "list" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-center rounded-r-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    style={{ minWidth: "120px", width: "auto" }}
                                >
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {statements.map((statement, index) => {
                                const teacherFullName = getTeacherFullName(statement.teacherLogin);
                                const disciplineName = getDisciplineName(statement.disciplineId);
                                const formattedDate = formatDate(statement.date);
    
                                return (
                                    <tr
                                        key={statement.id || `statement-${index}`}
                                        className={`${
                                            index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                                        } border-b-0`}
                                    >
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg"
                                            title={statement.id}
                                            style={{ minWidth: "50px", width: "1%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.id}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={teacherFullName}
                                            style={{ minWidth: "150px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {teacherFullName}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={disciplineName}
                                            style={{ minWidth: "120px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {disciplineName}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={statement.groupId}
                                            style={{ minWidth: "80px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.groupId}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={formattedDate}
                                            style={{ minWidth: "100px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {formattedDate}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={statement.practiceHours}
                                            style={{ minWidth: "60px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.practiceHours}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={statement.semester}
                                            style={{ minWidth: "80px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.semester}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                            title={statement.assessmentType}
                                            style={{ minWidth: "80px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.assessmentType}
                                        </td>
                                        <td
                                            className="py-3 px-4"
                                            title={statement.list}
                                            style={{ minWidth: "80px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                            {statement.list ? (
                                                <button
                                                    className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition whitespace-nowrap"
                                                    onClick={() => handleDownloadFile(statement.id)}
                                                >
                                                    Скачать
                                                </button>
                                            ) : (
                                                "Нет файла"
                                            )}
                                        </td>
                                        <td 
                                            className="py-3 px-4 text-center rounded-r-lg"
                                            style={{ minWidth: "120px", width: "auto" }}
                                        >
                                            <button
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition whitespace-nowrap"
                                                onClick={() => handleEditStatement(statement)}
                                            >
                                                Изменить
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
    
                <div className="flex justify-end space-x-4">
                    <button
                        className="px-6 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                        onClick={onCancel}
                    >
                        Отменить
                    </button>
                    <button
                        className="px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
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
        </>
    );
};

export default StatementTable;