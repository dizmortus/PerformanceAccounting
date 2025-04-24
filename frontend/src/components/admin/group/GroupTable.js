"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllGroups, fetchAllSpecialties } from "../../../utils/api";
import EditGroupModal from "./EditGroupModal";
import CreateGroupModal from "./CreateGroupModal";
import SearchableSelect from '../SearchableSelect';

const GroupTable = ({ onCancel }) => {
    const [editingGroup, setEditingGroup] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedFilters = localStorage.getItem("groups_filters");
            return savedFilters ? JSON.parse(savedFilters) : {
                specialtyId: "",
                educationForm: "",
                educationLevel: "",
                id: "",
                admissionYear: ""
            };
        }
        return {
            specialtyId: "",
            educationForm: "",
            educationLevel: "",
            id: "",
            admissionYear: ""
        };
    });

    useEffect(() => {
        localStorage.setItem("groups_filters", JSON.stringify(filters));
    }, [filters]);

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
            
            if (column === 'admissionYear' || column === 'educationLevel' || column === 'specialtyId') {
                valueA = parseInt(valueA);
                valueB = parseInt(valueB);
            }
            
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

// Фильтрация групп
const filteredGroups = useMemo(() => {
    if (!groups) return [];
    
    console.log('Filtering groups with filters:', filters);
    console.log('All groups:', groups);
    
    const result = groups.filter(group => {
        // Преобразуем оба значения к строкам для сравнения
        const groupSpecialtyStr = group.specialtyId?.toString();
        const filterSpecialtyStr = filters.specialtyId?.toString();
        
        const specialtyMatch = !filters.specialtyId || 
            groupSpecialtyStr === filterSpecialtyStr;
        
        console.log(`Group ID: ${group.id}, SpecialtyID: ${group.specialtyId} (${typeof group.specialtyId}), Filter: ${filters.specialtyId} (${typeof filters.specialtyId}), Match: ${specialtyMatch}`);
        
        return (
            (!filters.id || group.id?.toString()=== (filters.id.toString())) &&
            specialtyMatch &&
            (!filters.educationForm || group.educationForm === filters.educationForm) &&
            (!filters.educationLevel || group.educationLevel?.toString() === (filters.educationLevel === "" ? null : filters.educationLevel.toString())) &&
            (!filters.admissionYear || group.admissionYear?.toString()  ===  (filters.admissionYear.toString()))
        );
    });
    
    console.log('Filtered groups result:', result);
    return result;
}, [groups, filters]);

    const sortedGroups = sortData(filteredGroups, sortColumn, sortDirection);

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

// В обработчике изменения фильтра специальности
const handleFilterChange = (column, value) => {
    console.log(`Filter change - column: ${column}, value:`, value, 'type:', typeof value);
    setFilters(prev => {
        const newFilters = {
            ...prev,
            [column]: value
        };
        console.log('New filters:', newFilters);
        return newFilters;
    });
};
const getFilterOptions = useCallback((column) => {
    if (!groups) return [];
    
    return groups.filter(group => {
        return Object.entries(filters).every(([key, value]) => {
            if (key === column || !value) return true;
            
            // Сравниваем как строки
            const groupValue = group[key]?.toString();
            const filterValue = value?.toString();
            
            return groupValue === filterValue;
        });
    });
}, [groups, filters]);
    
    const idOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('id').forEach(group => group.id && values.add(group.id));
        return Array.from(values).sort((a, b) => a - b);
    }, [getFilterOptions]);
    
// В функции specialtyOptions добавим логирование
const specialtyOptions = useMemo(() => {
    const filteredGroupsForOptions = getFilterOptions('specialtyId');
    console.log('Groups for specialty options:', filteredGroupsForOptions);
    
    const values = new Set();
    filteredGroupsForOptions.forEach(group => {
        console.log(`Adding specialtyId: ${group.specialtyId} (type: ${typeof group.specialtyId})`);
        group.specialtyId && values.add(group.specialtyId);
    });
    
    const options = specialties
        .filter(specialty => {
            console.log(`Checking specialty ${specialty.id} (${specialty.name}) in values:`, values.has(specialty.id));
            return values.has(specialty.id);
        })
        .map(specialty => ({
            id: specialty.id.toString(),
            name: specialty.name
        }));
    
    console.log('Generated specialty options:', options);
    return options;
}, [getFilterOptions, specialties]);
    
    const educationFormOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('educationForm').forEach(group => group.educationForm && values.add(group.educationForm));
        return Array.from(values).sort();
    }, [getFilterOptions]);
    
    const educationLevelOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('educationLevel').forEach(group => group.educationLevel && values.add(group.educationLevel));
        return Array.from(values).sort().map(level => ({
            id: level,
            name: level === 1 ? "Бакалавриат" : "Магистратура"
        }));
    }, [getFilterOptions]);

    const admissionYearOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('admissionYear').forEach(group => group.admissionYear && values.add(group.admissionYear));
        return Array.from(values).sort((a, b) => b - a); // Сортировка по убыванию
    }, [getFilterOptions]);

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
                                <col style={{ width: getColumnWidth('id', '75px') }}/>
                                <col style={{ width: getColumnWidth('specialtyId', '400px') }}/>
                                <col style={{ width: getColumnWidth('admissionYear', '60px') }}/>
                                <col style={{ width: getColumnWidth('educationForm', '90px') }}/>
                                <col style={{ width: getColumnWidth('educationLevel', '100px') }}/>
                                <col style={{ width: '40px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                                {/* Заголовки столбцов */}
                                <tr className="h-[40px]">
                                    {["id", "specialtyId", "admissionYear", "educationForm", "educationLevel"].map((col, i) => (
                                        <th
                                            key={col}
                                            className={`px-4 text-left cursor-pointer ${
                                                i === 0 ? "rounded-tl-lg" : ""
                                            } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                                        >
                                            <div className="flex items-center h-full" onClick={() => handleSort(col)}>
                                                {{
                                                    id: "ID",
                                                    specialtyId: "Специальность",
                                                    admissionYear: "Год",
                                                    educationForm: "Форма обучения",
                                                    educationLevel: "Ступень обучения"
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
                                                onClick={handleCreateGroup}
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
                                        { field: "specialtyId", options: specialtyOptions, isSpecialty: true },
                                        { field: "admissionYear", options: admissionYearOptions },
                                        { field: "educationForm", options: educationFormOptions },
                                        { field: "educationLevel", options: educationLevelOptions, isEducationLevel: true }
                                    ].map(({ field, options, isSpecialty, isEducationLevel }, i) => (
                                        <td key={field} className={`px-2 border-b-0 ${i === 0 ? "rounded-bl-lg" : ""}`}>
                                            <div className="flex items-center w-full space-x-2">
                                                <div className="flex-1">
                                                    <SearchableSelect
                                                        options={options}
                                                        value={filters[field]}
                                                        onChange={(value) => handleFilterChange(field, value)}
                                                        placeholder="Фильтр"
                                                        formatOption={(option) => 
                                                            isSpecialty ? option.name : 
                                                            isEducationLevel ? option.name : 
                                                            option.toString()
                                                        }
                                                        getOptionValue={(option) => 
                                                            isSpecialty ? option.id : 
                                                            isEducationLevel ? option.id : 
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
                                        <td colSpan="6" className="py-4 text-center">Загрузка...</td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan="6" className="py-4 text-center text-red-500">
                                            Ошибка загрузки: {error.message}
                                        </td>
                                    </tr>
                                ) : sortedGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-4 text-center">Нет данных о группах</td>
                                    </tr>
                                ) : (
                                    sortedGroups.map((group, index) => (
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
                                                className="py-2 px-2 text-center rounded-r-lg truncate relative hover:bg-gray-50 cursor-pointer"
                                                title="Редактировать"
                                                onClick={() => handleEditGroup(group)}
                                            >
                                                <div className="flex justify-center">
                                                    <button
                                                        className="h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditGroup(group);
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