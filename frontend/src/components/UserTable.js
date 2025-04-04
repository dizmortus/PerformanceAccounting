"use client";
import { useEffect, useState, useCallback } from "react";
import { fetchAllUsers, fetchPossibleStatuses, fetchPossibleRoles } from "../utils/api";
import EditUserModal from "./EditUserModal";
import CreateUserModal from "./CreateUserModal";

const UserTable = ({ onCancel }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");

    const sortData = (data, column, direction) => {
        if (!column) return data;
        return [...data].sort((a, b) => {
            if (a[column] < b[column]) return direction === "asc" ? -1 : 1;
            if (a[column] > b[column]) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const usersData = await fetchAllUsers();
            const sortedUsers = sortData(usersData, sortColumn, sortDirection);
            setUsers(sortedUsers);
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

    const handleEditUser = (user) => {
        setEditingUser(user);
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        loadData();
    };

    const handleCreateUser = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        loadData();
    };

    const handleSort = (column) => {
        let direction = "asc";
        if (sortColumn === column && sortDirection === "asc") {
            direction = "desc";
        }
        setSortColumn(column);
        setSortDirection(direction);

        const sortedUsers = sortData(users, column, direction);
        setUsers(sortedUsers);
    };

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", resize: "horizontal", overflow: "auto" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список пользователей
                </h2>
    
                <div className="flex-1 overflow-auto mb-4">
                    <table className="w-full text-sm text-gray-900 border-collapse">
                        <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                            <tr>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer rounded-l-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("login")}
                                    style={{ minWidth: "120px", width: "auto" }}
                                >
                                    Логин {sortColumn === "login" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("lastName")}
                                    style={{ minWidth: "120px", width: "auto" }}
                                >
                                    Фамилия {sortColumn === "lastName" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("firstName")}
                                    style={{ minWidth: "100px", width: "auto" }}
                                >
                                    Имя {sortColumn === "firstName" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("patronymic")}
                                    style={{ minWidth: "120px", width: "auto" }}
                                >
                                    Отчество {sortColumn === "patronymic" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("email")}
                                    style={{ minWidth: "180px", width: "auto" }}
                                >
                                    Email {sortColumn === "email" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("role")}
                                    style={{ minWidth: "100px", width: "auto" }}
                                >
                                    Роль {sortColumn === "role" && (sortDirection === "asc" ? "▲" : "▼")}
                                </th>
                                <th 
                                    className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 whitespace-nowrap"
                                    onClick={() => handleSort("status")}
                                    style={{ minWidth: "100px", width: "auto" }}
                                >
                                    Статус {sortColumn === "status" && (sortDirection === "asc" ? "▲" : "▼")}
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
                            {users.map((user, index) => (
                                <tr
                                    key={user.login || `user-${index}`}
                                    className={`${
                                        index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                                    } border-b-0`}
                                >
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg"
                                        title={user.login}
                                        style={{ minWidth: "120px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.login}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.lastName}
                                        style={{ minWidth: "120px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.lastName}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.firstName}
                                        style={{ minWidth: "100px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.firstName}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.patronymic}
                                        style={{ minWidth: "120px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.patronymic}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.email}
                                        style={{ minWidth: "180px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.email}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.role}
                                        style={{ minWidth: "100px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.role}
                                    </td>
                                    <td
                                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
                                        title={user.status}
                                        style={{ minWidth: "100px", width: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                    >
                                        {user.status}
                                    </td>
                                    <td 
                                        className="py-3 px-4 text-center rounded-r-lg"
                                        style={{ minWidth: "120px", width: "auto" }}
                                    >
                                        <button
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition whitespace-nowrap"
                                            onClick={() => handleEditUser(user)}
                                        >
                                            Изменить
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
                        onClick={handleCreateUser}
                    >
                        Создать пользователя
                    </button>
                </div>
            </div>
    
            {editingUser && <EditUserModal user={editingUser} onClose={handleCloseModal} />}
            {isCreateModalOpen && <CreateUserModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default UserTable;