"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllDisciplines } from "../../../utils/api";
import EditDisciplineModal from "./EditDisciplineModal";
import CreateDisciplineModal from "./CreateDisciplineModal";
import SearchableSelect from '../SearchableSelect';

const DisciplineTable = ({ onCancel }) => {
    const [editingDiscipline, setEditingDiscipline] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedFilters = localStorage.getItem("disciplines_filters");
            return savedFilters ? JSON.parse(savedFilters) : {
                id: '',
                name: '',
                isPractice: ''
            };
        }
        return {
            id: '',
            name: '',
            isPractice: ''
        };
    });

    useEffect(() => {
        localStorage.setItem("disciplines_filters", JSON.stringify(filters));
    }, [filters]);

    const [sortColumn, setSortColumn] = useState(() => {
        return localStorage.getItem('disciplines_sortColumn') || 'name';
    });
    
    const [sortDirection, setSortDirection] = useState(() => {
        return localStorage.getItem('disciplines_sortDirection') || 'asc';
    });

    const sortData = (data, column, direction) => {
        if (!column || !Array.isArray(data)) return data;
        
        return [...data].sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            if (['name'].includes(column)) {
                valueA = valueA?.toLowerCase() || '';
                valueB = valueB?.toLowerCase() || '';
            }
            
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const { 
        data: disciplinesData, 
        isLoading, 
        isError, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 5 * 60 * 1000,
    });

    const filteredDisciplines = useMemo(() => {
        if (!disciplinesData) return [];
        
        const disciplines = disciplinesData?.data || disciplinesData || [];
        
        return disciplines.filter(discipline => {
            return (
                (!filters.id || discipline.id?.toString() === filters.id) &&
                (!filters.name || discipline.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
                (filters.isPractice === '' || discipline.isPractice === (filters.isPractice === 'true'))
            );
        });
    }, [disciplinesData, filters]);

    const sortedDisciplines = sortData(filteredDisciplines, sortColumn, sortDirection);

    const refreshMutation = useMutation({
        mutationFn: refetch,
        onSuccess: () => {
            setEditingDiscipline(null);
            setIsCreateModalOpen(false);
        }
    });

    const handleEditDiscipline = (discipline) => {
        setEditingDiscipline(discipline);
    };

    const handleCloseModal = () => {
        refreshMutation.mutate();
    };

    const handleCreateDiscipline = () => {
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
        
        localStorage.setItem('disciplines_sortColumn', column);
        localStorage.setItem('disciplines_sortDirection', direction);
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = ['name'];
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

    const handleFilterChange = (column, value) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const getFilterOptions = useCallback((column) => {
        if (!disciplinesData) return [];
    
        const disciplines = disciplinesData?.data || disciplinesData || [];
    
        return disciplines.filter(discipline => {
            return Object.entries(filters).every(([key, value]) => {
                if (key === column || !value) return true;
    
                if (key === "isPractice") {
                    return discipline[key] === (value === 'true');
                }
    
                return discipline[key]?.toLowerCase().includes(value.toLowerCase());
            });
        });
    }, [disciplinesData, filters]);
    
    const nameOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('name').forEach(discipline => discipline.name && values.add(discipline.name));
        return Array.from(values).sort();
    }, [getFilterOptions]);
    
    const idOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('id').forEach(discipline => discipline.id && values.add(discipline.id));
        return Array.from(values).sort((a, b) => a - b);
    }, [getFilterOptions]);

    const practiceOptions = [
        { value: 'true', label: 'Да' },
        { value: 'false', label: 'Нет' }
    ];

    return (
        <>
            <div
                className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col"
                style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}
            >
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список дисциплин
                </h2>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: getColumnWidth("id", "100px") }} />
                                <col style={{ width: getColumnWidth("name", "300px") }} />
                                <col style={{ width: getColumnWidth("isPractice", "150px") }} />
                                <col style={{ width: "40px" }} />
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                <tr className="h-[40px]">
                                    {["id", "name", "isPractice"].map((col, i) => (
                                        <th
                                            key={col}
                                            className={`px-4 text-left cursor-pointer ${
                                                i === 0 ? "rounded-tl-lg" : ""
                                            } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        >
                                            <div className="flex items-center h-full" onClick={() => handleSort(col)}>
                                                {{
                                                    id: "ID",
                                                    name: "Название",
                                                    isPractice: "Практика",
                                                }[col]}{" "}
                                                {sortColumn === col && (sortDirection === "asc" ? "▲" : "▼")}
                                            </div>
                                        </th>
                                    ))}

                                    <th className="px-2 text-center border-b-0 rounded-tr-lg rounded-br-lg " colSpan="1" rowSpan="2">
                                        <div className="flex justify-center">
                                            <button
                                                className="h-[40px] w-[40px] bg-teal-500 text-white rounded-lg shadow hover:bg-teal-600 transition flex items-center justify-center"
                                                onClick={handleCreateDiscipline}
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

                                <tr className="h-[40px]">
                                    {[
                                        { field: "id", options: idOptions },
                                        { field: "name", options: nameOptions },
                                        { field: "isPractice", options: practiceOptions, isPractice: true },
                                    ].map(({ field, options, isPractice }, i) => (
                                        <td key={field} className={`px-2 border-b-0 ${i === 0 ? "rounded-bl-lg" : ""}`}>
                                            <div className="flex items-center w-full space-x-2">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        options={options}
                                                        value={filters[field]}
                                                        onChange={(value) => handleFilterChange(field, value)}
                                                        placeholder="Фильтр"
                                                        formatOption={(option) => {
                                                            if (isPractice) return option.label;
                                                            return option;
                                                        }}
                                                        getOptionValue={(option) => {
                                                            if (isPractice) return option.value;
                                                            return option;
                                                        }}
                                                        className="w-full"
                                                        fontSize="sm"
                                                    />
                                                </div>
                                                {filters[field] && (
                                                    <button
                                                        className="text-gray-500 hover:text-red-600 transition px-1"
                                                        onClick={() => handleFilterChange(field, "")}
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
                                        <td colSpan="4" className="py-4 text-center">
                                            Загрузка...
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan="4" className="py-4 text-center text-red-500">
                                            Ошибка загрузки: {error.message}
                                        </td>
                                    </tr>
                                ) : sortedDisciplines.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-4 text-center">
                                            Нет данных о дисциплинах
                                        </td>
                                    </tr>
                                ) : (
                                    sortedDisciplines.map((discipline, index) => (
                                        <tr
                                            key={discipline.id || `discipline-${index}`}
                                            className={`${
                                                index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                                            } border-b-0`}
                                        >
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                                                title={discipline.id}
                                                onClick={() => handleCellClick("ID", discipline.id)}
                                            >
                                                {discipline.id}
                                            </td>
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                title={discipline.name}
                                                onClick={() => handleCellClick("Название", discipline.name)}
                                            >
                                                {discipline.name}
                                            </td>
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                title={discipline.isPractice ? "Да" : "Нет"}
                                                onClick={() => handleCellClick("Практика", discipline.isPractice ? "Да" : "Нет")}
                                            >
                                                {discipline.isPractice ? "Да" : "Нет"}
                                            </td>
                                            <td
                                                className="py-2 px-2 text-center rounded-r-lg truncate relative hover:bg-gray-50 cursor-pointer"
                                                title="Редактировать"
                                                onClick={() => handleEditDiscipline(discipline)}
                                            >
                                                <div className="flex justify-center">
                                                    <button
                                                        className="h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditDiscipline(discipline);
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

            {cellContentModal.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md w-full">
                        <h2 className="text-xl font-semibold mb-4">{cellContentModal.title}</h2>
                        <div className="text-gray-700 mb-4 p-4 bg-gray-100 rounded break-words">
                            {cellContentModal.content}
                        </div>
                        <button
                            onClick={() => setCellContentModal({ ...cellContentModal, isOpen: false })}
                            className="w-36 px-6 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                        >
                            ОК
                        </button>
                    </div>
                </div>
            )}

            {editingDiscipline && <EditDisciplineModal discipline={editingDiscipline} onClose={handleCloseModal} />}
            {isCreateModalOpen && <CreateDisciplineModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default DisciplineTable;