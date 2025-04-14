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

    const downloadMutation = useMutation({
        mutationFn: downloadStatement,
        useErrorBoundary: false,
        onError: (error, statementId) => {
            if (!error.silent && process.env.NODE_ENV === 'development') {
                console.warn('Download error:', error.message);
            }
            
            // Если файл не найден, обновляем данные
            if (error.message.includes("не найден на сервере")) {
                queryClient.invalidateQueries(['statements']);
            }
            
            setErrorMessage(error.message);
            setIsErrorModalOpen(true);
        },
        onSuccess: () => {
            // Обновляем данные после успешного скачивания
            queryClient.invalidateQueries(['statements']);
        },
        meta: { suppressErrorLogging: true }
    });
    

    const handleDownloadFile = (statementId) => {
        downloadMutation.mutate(statementId);
    };

    // Функция для получения полного ФИО преподавателя
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
    const isLoading = isStatementsLoading || isTeachersLoading || isDisciplinesLoading;
    const isError = isStatementsError || isTeachersError || isDisciplinesError;

    // Function to get column width with extra space for sorting arrow
// Функция для получения ширины столбца с дополнительным пространством для стрелки сортировки
const getColumnWidth = (columnName, baseWidth) => {
    // Столбцы, которым нужно добавить дополнительное пространство
    const extraWidthColumns = ['teacherLogin', 'semester', 'practiceHours', 'creditUnits'];
    
    if (sortColumn === columnName && extraWidthColumns.includes(columnName)) {
        return `${parseInt(baseWidth) + 11}px`;
    }
    return baseWidth;
};
   // Новое состояние для модального окна с текстом ячейки
   const [cellContentModal, setCellContentModal] = useState({
    isOpen: false,
    title: "",
    content: ""
});

// Обработчик клика по ячейке
    // Обработчик клика по ячейке
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
    <col style={{ width: getColumnWidth('id', '75px') }}/> 
    <col style={{ width: getColumnWidth('teacherLogin', '110px') }}/>
    <col style={{ width: getColumnWidth('groupId', '70px') }}/>
    <col style={{ width: getColumnWidth('semester', '65px') }}/>
    <col style={{ width: getColumnWidth('disciplineId', '150px') }}/>
    <col style={{ width: getColumnWidth('practiceHours', '50px') }}/>
    <col style={{ width: getColumnWidth('creditUnits', '45px') }}/>
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
                                        Дисциплина {sortColumn === "disciplineId" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("practiceHours")}
                                    >
                                        Часы {sortColumn === "practiceHours" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("creditUnits")}
                                    >
                                        З.Е. {sortColumn === "creditUnits" && (sortDirection === "asc" ? "▲" : "▼")}
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
                                    <th 
                                        className="py-3 px-4 text-center rounded-r-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
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
                {teacherFullName}
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
            
            {/* Часы */}
            <td
                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                title={statement.practiceHours}
                onClick={() => handleCellClick("Часы", statement.practiceHours)}
            >
                {statement.practiceHours}
            </td>
            
            {/* З.Е. */}
            <td
                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                title={statement.creditUnits || '-'}
                onClick={() => handleCellClick("З.Е.", statement.creditUnits || '-')}
            >
                {statement.creditUnits || '-'}
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
            <td
                className="py-2 px-2 truncate"
                title={statement.list || 'Нет файла'}
                onClick={() => statement.list && handleCellClick("Файл", statement.list)}
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
            </td>
            
            {/* Действия */}
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
    );
})}
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
              {/* Модальное окно для отображения содержимого ячейки */}
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
        </>
    );
};

export default StatementTable;