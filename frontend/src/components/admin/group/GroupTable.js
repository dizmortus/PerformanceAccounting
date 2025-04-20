"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllGroups, fetchAllSpecialties } from "../../../utils/api";
import EditGroupModal from "./EditGroupModal";
import CreateGroupModal from "./CreateGroupModal";

const GroupTable = ({ onCancel }) => {
    const [editingGroup, setEditingGroup] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [sortColumn, setSortColumn] = useState(() => {
        return localStorage.getItem('groups_sortColumn') || 'id';
    });
    
    const [sortDirection, setSortDirection] = useState(() => {
        return localStorage.getItem('groups_sortDirection') || 'asc';
    });

    const { 
        data: groups = [], 
        isLoading, 
        isError, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 5 * 60 * 1000,
    });

    const { 
        data: specialties = [], 
        isLoading: isSpecialtiesLoading 
    } = useQuery({
        queryKey: ['specialties'],
        queryFn: fetchAllSpecialties,
        staleTime: 10 * 60 * 1000,
    });

    const refreshMutation = useMutation({
        mutationFn: refetch,
        onSuccess: () => {
            setEditingGroup(null);
            setIsCreateModalOpen(false);
        }
    });

    const sortData = (data, column, direction) => {
        if (!column) return data;
        
        return [...data].sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            // Специальная обработка для года поступления
            if (column === 'admissionYear') {
                valueA = parseInt(valueA);
                valueB = parseInt(valueB);
            }
            
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const handleEditGroup = (group) => {
        setEditingGroup(group);
    };

    const handleCloseModal = () => {
        refreshMutation.mutate();
    };

    const handleCreateGroup = () => {
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
        
        localStorage.setItem('groups_sortColumn', column);
        localStorage.setItem('groups_sortDirection', direction);
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    const getSpecialtyName = (specialtyId) => {
        const specialty = specialties.find(s => s.id === specialtyId);
        return specialty ? specialty.name : "Неизвестная специальность";
    };

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

    const handleCellClick = (title, content) => {
        setCellContentModal({
            isOpen: true,
            title,
            content: content || "Нет данных"
        });
    };

    const sortedGroups = sortData(groups, sortColumn, sortDirection);

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список групп
                </h2>
    
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: getColumnWidth('id', '55px') }}/>
                                <col style={{ width: getColumnWidth('specialtyId', '300px') }}/>
                                <col style={{ width: getColumnWidth('admissionYear', '50px') }}/>
                                <col style={{ width: getColumnWidth('educationForm', '90px') }}/>
                                <col style={{ width: getColumnWidth('educationLevel', '100px') }}/>
                                <col style={{ width: '70px' }}/>
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
                                        onClick={() => handleSort("specialtyId")}
                                    >
                                        Специальность {sortColumn === "specialtyId" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("admissionYear")}
                                    >
                                        Год {sortColumn === "admissionYear" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("educationForm")}
                                    >
                                        Форма обучения {sortColumn === "educationForm" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                        onClick={() => handleSort("educationLevel")}
                                    >
                                        Ступень обучения {sortColumn === "educationLevel" && (sortDirection === "asc" ? "▲" : "▼")}
                                    </th>
                                    <th 
                                        className="py-3 px-4 text-center rounded-r-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate"
                                    >
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGroups.map((group, index) => (
                                    <tr
                                        key={group.id || `group-${index}`}
                                        className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0`}
                                    >
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                                            title={group.id}
                                            onClick={() => handleCellClick("ID", group.id)}
                                        >
                                            {group.id}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={getSpecialtyName(group.specialtyId)}
                                            onClick={() => handleCellClick("Специальность", getSpecialtyName(group.specialtyId))}
                                        >
                                            {getSpecialtyName(group.specialtyId)}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={group.admissionYear}
                                            onClick={() => handleCellClick("Год поступления", group.admissionYear)}
                                        >
                                            {group.admissionYear}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={group.educationForm}
                                            onClick={() => handleCellClick("Форма обучения", group.educationForm)}
                                        >
                                            {group.educationForm}
                                        </td>
                                        <td
                                            className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                            title={group.educationLevel === 1 ? "Бакалавриат" : "Магистратура"}
                                            onClick={() => handleCellClick("Ступень обучения", 
                                                group.educationLevel === 1 ? "Бакалавриат" : "Магистратура")}
                                        >
                                            {group.educationLevel === 1 ? "Бакалавриат" : "Магистратура"}
                                        </td>
                                        <td 
                                            className="py-2 px-2 text-center rounded-r-lg truncate"
                                        >
                                            <button
                                                className="h-[40px] px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition truncate w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditGroup(group);
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
                        onClick={handleCreateGroup}
                    >
                        Создать группу
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

            {editingGroup && <EditGroupModal group={editingGroup} onClose={handleCloseModal} />}
            {isCreateModalOpen && <CreateGroupModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default GroupTable;