"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllUsers, fetchPossibleStatuses, fetchPossibleRoles } from "../../../utils/api";
import EditUserModal from "./EditUserModal";
import CreateUserModal from "./CreateUserModal";

const UserTable = ({ onCancel, currentUserLogin  }) => {
    // Загрузка данных с использованием React Query
    const { 
        data: users = [], 
        isLoading, 
        isError, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['users'],
        queryFn: fetchAllUsers,
        staleTime: 5 * 60 * 1000, // 5 минут кэширования
    });

    const [editingUser, setEditingUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Инициализация состояния сортировки из Local Storage
    const [sortColumn, setSortColumn] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('users_sortColumn') || null;
        }
        return null;
    });
    
    const [sortDirection, setSortDirection] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('users_sortDirection') || 'asc';
        }
        return 'asc';
    });

    // Мутация для перезагрузки данных
    const refreshMutation = useMutation({
        mutationFn: refetch,
        onSuccess: () => {
            setEditingUser(null);
            setIsCreateModalOpen(false);
        }
    });

    const sortData = (data, column, direction) => {
        if (!column || !data) return data;
        
        return [...data].sort((a, b) => {
            const valueA = a[column]?.toString().toLowerCase() || '';
            const valueB = b[column]?.toString().toLowerCase() || '';
            
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
    };

    const handleCloseModal = () => {
        refreshMutation.mutate();
    };

    const handleCreateUser = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        refreshMutation.mutate();
    };

    const handleSort = (column) => {
        let direction = "asc";
        if (sortColumn === column) {
            direction = sortDirection === "asc" ? "desc" : "asc";
        }
        
        // Сохраняем параметры сортировки
        if (typeof window !== 'undefined') {
            localStorage.setItem('users_sortColumn', column);
            localStorage.setItem('users_sortDirection', direction);
        }
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    // Сортируем данные с учетом сохраненных параметров
    const sortedUsers = sortData(users, sortColumn, sortDirection);
    const [cellContentModal, setCellContentModal] = useState({
        isOpen: false,
        title: "",
        content: ""
    });

    // Обработчик клика по ячейке
    const handleCellClick = (title, content) => {
        setCellContentModal({
            isOpen: true,
            title,
            content: content || "Нет данных"
        });
    };
    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = []; // Столбцы, которые могут быть шире
        
        if (sortColumn === columnName && extraWidthColumns.includes(columnName)) {
            return `${parseInt(baseWidth) + 11}px`;
        }
        return baseWidth;
    };
    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список пользователей
                </h2>
    
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: getColumnWidth('login', '70px') }}/>
                                <col style={{ width: getColumnWidth('lastName', '80px') }}/>
                                <col style={{ width: getColumnWidth('firstName', '80px') }}/>
                                <col style={{ width: getColumnWidth('patronymic', '80px') }}/>
                                <col style={{ width: getColumnWidth('email', '120px') }}/>
                                <col style={{ width: getColumnWidth('role', '80px') }}/>
                                <col style={{ width: getColumnWidth('status', '90px') }}/>
                                <col style={{ width: '85px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                <tr>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer rounded-l-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("login")}
                                    >
                                        Логин {sortColumn === "login" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("lastName")}
                                    >
                                        Фамилия {sortColumn === "lastName" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("firstName")}
                                    >
                                        Имя {sortColumn === "firstName" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("patronymic")}
                                    >
                                        Отчество {sortColumn === "patronymic" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("email")}
                                    >
                                        Email {sortColumn === "email" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("role")}
                                    >
                                        Роль {sortColumn === "role" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("status")}
                                    >
                                        Статус {sortColumn === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-center rounded-r-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                    >
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map((user, index) => (
                                    <tr
                                        key={user.login || `user-${index}`}
                                        className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0`}
                                    >
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                                            title={user.login}
                                            onClick={() => handleCellClick("Логин", user.login)}
                                        >
                                            {user.login}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.lastName}
                                            onClick={() => handleCellClick("Фамилия", user.lastName)}
                                        >
                                            {user.lastName}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.firstName}
                                            onClick={() => handleCellClick("Имя", user.firstName)}
                                        >
                                            {user.firstName}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.patronymic}
                                            onClick={() => handleCellClick("Отчество", user.patronymic)}
                                        >
                                            {user.patronymic}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.email}
                                            onClick={() => handleCellClick("Email", user.email)}
                                        >
                                            {user.email}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.role}
                                            onClick={() => handleCellClick("Роль", user.role)}
                                        >
                                            {user.role}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={user.status}
                                            onClick={() => handleCellClick("Статус", user.status)}
                                        >
                                            {user.status}
                                        </td>
                                        <td 
                                            className="py-2 px-2 text-center rounded-r-lg truncate"
                                        >
                                            <button
                                                className="h-[40px] px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition truncate w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditUser(user);
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
                        onClick={handleCreateUser}
                    >
                        Создать пользователя
                    </button>
                </div>
            </div>

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

            {editingUser && <EditUserModal user={editingUser} onClose={handleCloseModal}  currentUserLogin={currentUserLogin} />}
            {isCreateModalOpen && <CreateUserModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default UserTable