"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllUsers, fetchPossibleStatuses, fetchPossibleRoles } from "../../../utils/api";
import EditUserModal from "./EditUserModal";
import CreateUserModal from "./CreateUserModal";
import SearchableSelect from '../SearchableSelect';
import ContentModal from '../ContentModal';

const UserTable = ({ onCancel, currentUserLogin }) => {
    const [editingUser, setEditingUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedFilters = localStorage.getItem("users_filters");
            return savedFilters ? JSON.parse(savedFilters) : {
                login: '',
                lastName: '',
                firstName: '',
                patronymic: '',
                email: '',
                role: '',
                status: ''
            };
        }
        return {
            login: '',
            lastName: '',
            firstName: '',
            patronymic: '',
            email: '',
            role: '',
            status: ''
        };
    });

    useEffect(() => {
        localStorage.setItem("users_filters", JSON.stringify(filters));
    }, [filters]);

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


    const { 
        data: users = [], 
        isLoading, 
        isError, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['users'],
        queryFn: () => fetchAllUsers({ sameFacultyOnly: true }), // Добавляем параметр для фильтрации по факультету
        staleTime: 5 * 60 * 1000,
    });

    const { data: possibleStatuses = [] } = useQuery({
        queryKey: ['possibleStatuses'],
        queryFn: fetchPossibleStatuses,
    });

    const { data: possibleRoles = [] } = useQuery({
        queryKey: ['possibleRoles'],
        queryFn: fetchPossibleRoles,
    });

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

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        
        return users.filter(user => {
            return (
                (!filters.login || user.login?.toLowerCase()===(filters.login.toLowerCase())) &&
                (!filters.lastName || user.lastName?.toLowerCase()===(filters.lastName.toLowerCase())) &&
                (!filters.firstName || user.firstName?.toLowerCase()===(filters.firstName.toLowerCase())) &&
                (!filters.patronymic || (user.patronymic && user.patronymic.toLowerCase()===(filters.patronymic.toLowerCase()))) &&
                (!filters.email || user.email?.toLowerCase()===(filters.email.toLowerCase())) &&
                (!filters.role || user.role === filters.role) &&
                (!filters.status || user.status === filters.status)
            );
        });
    }, [users, filters]);

    const sortedUsers = sortData(filteredUsers, sortColumn, sortDirection);

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
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('users_sortColumn', column);
            localStorage.setItem('users_sortDirection', direction);
        }
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    const [cellContentModal, setCellContentModal] = useState({
        isOpen: false,
        title: "",
        content: ""
    });

    const handleCellClick = (title, content) => {
        setCellContentModal({
            isOpen: true,
            title,
            content: content || "Нет данных"
        });
    };

    const handleFilterChange = (column, value) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const getFilterOptions = useCallback((column) => {
        if (!users) return [];
    
        return users.filter(user => {
            return Object.entries(filters).every(([key, value]) => {
                if (key === column || !value) return true;
    
                if (key === "role" || key === "status") {
                    return user[key] === value;
                }
    
                return user[key]?.toString().toLowerCase().includes(value.toLowerCase());
            });
        });
    }, [users, filters]);

    const loginOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('login').forEach(user => user.login && values.add(user.login));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const lastNameOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('lastName').forEach(user => user.lastName && values.add(user.lastName));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const firstNameOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('firstName').forEach(user => user.firstName && values.add(user.firstName));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const patronymicOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('patronymic').forEach(user => user.patronymic && values.add(user.patronymic));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const emailOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('email').forEach(user => user.email && values.add(user.email));
        return Array.from(values).sort();
    }, [getFilterOptions]);

    const roleOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('role').forEach(user => user.role && values.add(user.role));
        return possibleRoles.filter(role => values.has(role));
    }, [getFilterOptions, possibleRoles]);

    const statusOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('status').forEach(user => user.status && values.add(user.status));
        return possibleStatuses.filter(status => values.has(status));
    }, [getFilterOptions, possibleStatuses]);

    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = [];
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
                                <col style={{ width: '30px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                {/* Заголовки столбцов */}
                                <tr className="h-[40px]">
                                    {["login", "lastName", "firstName", "patronymic", "email", "role", "status"].map((col, i) => (
                                        <th
                                            key={col}
                                            className={`px-4 text-left cursor-pointer ${
                                                i === 0 ? "rounded-tl-lg" : ""
                                            } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        >
                                            <div className="flex items-center h-full" onClick={() => handleSort(col)}>
                                                {{
                                                    login: "Логин",
                                                    lastName: "Фамилия",
                                                    firstName: "Имя",
                                                    patronymic: "Отчество",
                                                    email: "Email",
                                                    role: "Роль",
                                                    status: "Статус"
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
                                                onClick={handleCreateUser}
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
                                        { field: "login", options: loginOptions },
                                        { field: "lastName", options: lastNameOptions },
                                        { field: "firstName", options: firstNameOptions },
                                        { field: "patronymic", options: patronymicOptions },
                                        { field: "email", options: emailOptions },
                                        { field: "role", options: roleOptions },
                                        { field: "status", options: statusOptions }
                                    ].map(({ field, options }, i) => (
                                        <td key={field} className={`px-2 border-b-0 ${i === 0 ? "rounded-bl-lg" : ""}`}>
                                            <div className="flex items-center w-full space-x-2">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        options={options}
                                                        value={filters[field]}
                                                        onChange={(value) => handleFilterChange(field, value)}
                                                        placeholder="Фильтр"
                                                        formatOption={(option) => option}
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
                                        <td colSpan="8" className="py-4 text-center">Загрузка...</td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan="8" className="py-4 text-center text-red-500">
                                            Ошибка загрузки: {error.message}
                                        </td>
                                    </tr>
                                ) : sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-4 text-center">Нет данных о пользователях</td>
                                    </tr>
                                ) : (
                                    sortedUsers.map((user, index) => (
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
                                                className="py-2 px-2 text-center rounded-r-lg truncate relative hover:bg-gray-50 cursor-pointer"
                                                title="Редактировать"
                                                onClick={() => handleEditUser(user)}
                                            >
                                                <div className="flex justify-center">
                                                    <button
                                                        className="h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditUser(user);
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    
           <ContentModal
  isOpen={cellContentModal.isOpen}
  onClose={() => setCellContentModal({...cellContentModal, isOpen: false})}
  title={cellContentModal.title}
  content={cellContentModal.content}
  onCopy={() => navigator.clipboard.writeText(cellContentModal.content)}
/>
    
            {editingUser && <EditUserModal user={editingUser} onClose={handleCloseModal} currentUserLogin={currentUserLogin} />}
            {isCreateModalOpen && <CreateUserModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default UserTable;