import { useEffect, useState, useCallback } from "react";
import { fetchAllStatements, fetchAllTeachers, fetchAllDisciplines, downloadStatement } from "../utils/api"; // Импорт функции downloadStatement
import EditStatementModal from "./EditStatementModal";
import CreateStatementModal from "./CreateStatementModal";

const StatementTable = ({ onCancel }) => {
    const [statements, setStatements] = useState([]);
    const [teachers, setTeachers] = useState([]); // Состояние для преподавателей
    const [disciplines, setDisciplines] = useState([]); // Состояние для дисциплин
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingStatement, setEditingStatement] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");

    // Функция для получения фамилии и инициалов преподавателя
    const getTeacherFullName = (teacherLogin) => {
        const teacher = teachers.find((t) => t.login === teacherLogin);
        if (!teacher) return "Неизвестный преподаватель";
        const { lastName, firstName, patronymic } = teacher;
        const initials = `${firstName ? firstName[0] + ". " : ""}${patronymic ? patronymic[0] + "." : ""}`;
        return `${lastName} ${initials}`;
    };

    // Функция для получения названия дисциплины
    const getDisciplineName = (disciplineId) => {
        const discipline = disciplines.find((d) => d.id === disciplineId);
        return discipline ? discipline.name : "Неизвестная дисциплина";
    };

    // Функция для сортировки данных
    const sortData = (data, column, direction) => {
        if (!column) return data;
        return [...data].sort((a, b) => {
            const valueA = a[column] || ""; // Если значение пустое, используем пустую строку
            const valueB = b[column] || ""; // Если значение пустое, используем пустую строку

            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    // Загрузка данных
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Загружаем ведомости, преподавателей и дисциплины одновременно
            const [statementsData, teachersData, disciplinesData] = await Promise.all([
                fetchAllStatements(),
                fetchAllTeachers(),
                fetchAllDisciplines(),
            ]);

            setTeachers(teachersData);
            setDisciplines(disciplinesData);

            // Сортируем ведомости
            const sortedStatements = sortData(statementsData, sortColumn, sortDirection);
            setStatements(sortedStatements);
        } catch (error) {
            console.error("Ошибка при загрузке данных:", error);
            setError("Не удалось загрузить данные. Пожалуйста, попробуйте снова.");
        } finally {
            setLoading(false);
        }
    }, [sortColumn, sortDirection]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditStatement = (statement) => {
        setEditingStatement(statement);
    };

    const handleCloseModal = () => {
        setEditingStatement(null);
        loadData();
    };

    const handleCreateStatement = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        loadData();
    };

    const handleSort = (column) => {
        let direction = "asc";
        if (sortColumn === column) {
            direction = sortDirection === "asc" ? "desc" : "asc";
        }
        setSortColumn(column);
        setSortDirection(direction);

        const sortedStatements = sortData(statements, column, direction);
        setStatements(sortedStatements);
    };

    // Обновлённая функция для скачивания файла
    const handleDownloadFile = async (statementId) => {
        try {
            await downloadStatement(statementId); // Используем функцию downloadStatement из api.js
        } catch (error) {
            console.error("Ошибка при скачивании файла:", error);
            setError("Не удалось скачать файл. Пожалуйста, попробуйте снова.");
        }
    };

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", resize: "horizontal", overflow: "auto" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список ведомостей
                </h2>

                <div className="flex-1 overflow-auto mb-4">
                    <table className="w-full text-sm text-gray-900 border-collapse table-fixed rounded-lg">
                        <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                            <tr>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer rounded-l-lg border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("id")}
                                >
                                    ID ведомости {sortColumn === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("teacherLogin")}
                                >
                                    Преподаватель {sortColumn === "teacherLogin" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("disciplineId")}
                                >
                                    Дисциплина {sortColumn === "disciplineId" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("groupId")}
                                >
                                    ID Группы {sortColumn === "groupId" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("practiceHours")}
                                >
                                    Часы практики {sortColumn === "practiceHours" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("semester")}
                                >
                                    Семестр {sortColumn === "semester" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("assessmentType")}
                                >
                                    Тип аттестации {sortColumn === "assessmentType" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200"
                                    onClick={() => handleSort("list")}
                                >
                                    Файл {sortColumn === "list" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th className="py-3 px-4 text-center rounded-r-lg border-b-0 hover:bg-gray-400 transition-colors duration-200">
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {statements.map((statement, index) => {
                                const teacherFullName = getTeacherFullName(statement.teacherLogin);
                                const disciplineName = getDisciplineName(statement.disciplineId);

                                return (
                                    <tr
                                        key={statement.id || `statement-${index}`}
                                        className={`${
                                            index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                                        } border-b-0`}
                                    >
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer rounded-l-lg"
                                            title={statement.id}
                                        >
                                            <span className="block truncate">{statement.id}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={teacherFullName}
                                        >
                                            <span className="block truncate">{teacherFullName}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={disciplineName}
                                        >
                                            <span className="block truncate">{disciplineName}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={statement.groupId}
                                        >
                                            <span className="block truncate">{statement.groupId}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={statement.practiceHours}
                                        >
                                            <span className="block truncate">{statement.practiceHours}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={statement.semester}
                                        >
                                            <span className="block truncate">{statement.semester}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate hover:bg-gray-50 cursor-pointer"
                                            title={statement.assessmentType}
                                        >
                                            <span className="block truncate">{statement.assessmentType}</span>
                                        </td>
                                        <td
                                            className="py-3 px-4 truncate"
                                            title={statement.list}
                                        >
                                            {statement.list ? (
                                                <button
                                                    className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
                                                    onClick={() => handleDownloadFile(statement.id)} // Передаём statement.id
                                                >
                                                    Скачать
                                                </button>
                                            ) : (
                                                <span className="block truncate">Нет файла</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center rounded-r-lg">
                                            <button
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                                onClick={() => handleEditStatement(statement)}
                                            >
                                                Изменить
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="rounded-b-lg">
                                <td colSpan="9" className="py-3 px-4 text-center rounded-b-lg">
                                    {/* Примечание, если требуется выводить что-то в футере */}
                                </td>
                            </tr>
                        </tfoot>
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
        </>
    );
};

export default StatementTable;