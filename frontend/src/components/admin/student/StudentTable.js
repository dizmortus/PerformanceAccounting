"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllStudents, fetchAllGroups } from "../../../utils/api";
import EditStudentModal from "./EditStudentModal";
import CreateStudentModal from "./CreateStudentModal";
import SearchableSelect from '../SearchableSelect';

const StudentTable = ({ onCancel }) => {
    const [editingStudent, setEditingStudent] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        lastName: '',
        firstName: '',
        patronymic: '',
        groupId: ''
    });
    
    const [sortColumn, setSortColumn] = useState(() => {
        return localStorage.getItem('students_sortColumn') || 'lastName';
    });
    
    const [sortDirection, setSortDirection] = useState(() => {
        return localStorage.getItem('students_sortDirection') || 'asc';
    });

    // Функция сортировки
    const sortData = (data, column, direction) => {
        if (!column || !Array.isArray(data)) return data;
        
        return [...data].sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            if (['lastName', 'firstName', 'patronymic'].includes(column)) {
                valueA = valueA?.toLowerCase() || '';
                valueB = valueB?.toLowerCase() || '';
            }
            
            if (valueA < valueB) return direction === "asc" ? -1 : 1;
            if (valueA > valueB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const { 
        data: studentsData, 
        isLoading, 
        isError, 
        error,
        refetch 
    } = useQuery({
        queryKey: ['students'],
        queryFn: fetchAllStudents,
        staleTime: 5 * 60 * 1000,
    });

    const { 
        data: groups = [], 
        isLoading: isGroupsLoading 
    } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 10 * 60 * 1000,
    });

    // Фильтрация студентов
    const filteredStudents = useMemo(() => {
        if (!studentsData) return [];
        
        const students = studentsData?.data || studentsData || [];
        
        return students.filter(student => {
            return (
                (!filters.lastName || student.lastName?.toLowerCase().includes(filters.lastName.toLowerCase())) &&
                (!filters.firstName || student.firstName?.toLowerCase().includes(filters.firstName.toLowerCase())) &&
                (!filters.patronymic || (student.patronymic && student.patronymic.toLowerCase().includes(filters.patronymic.toLowerCase()))) &&
                (!filters.groupId || student.groupId === filters.groupId)
            );
        });
    }, [studentsData, filters]);

    const sortedStudents = sortData(filteredStudents, sortColumn, sortDirection);

    const refreshMutation = useMutation({
        mutationFn: refetch,
        onSuccess: () => {
            setEditingStudent(null);
            setIsCreateModalOpen(false);
        }
    });

    const handleEditStudent = (student) => {
        setEditingStudent(student);
    };

    const handleCloseModal = () => {
        refreshMutation.mutate();
    };

    const handleCreateStudent = () => {
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
        
        localStorage.setItem('students_sortColumn', column);
        localStorage.setItem('students_sortDirection', direction);
        
        setSortColumn(column);
        setSortDirection(direction);
    };

    const getGroupName = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        return group ? `${group.id}` : "Неизвестная группа";
    };

    const getColumnWidth = (columnName, baseWidth) => {
        const extraWidthColumns = ['lastName', 'firstName', 'patronymic'];
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

    // Получаем уникальные значения для фильтров
    const lastNameOptions = useMemo(() => {
        const values = new Set();
        filteredStudents.forEach(student => student.lastName && values.add(student.lastName));
        return Array.from(values).sort();
    }, [filteredStudents]);

    const firstNameOptions = useMemo(() => {
        const values = new Set();
        filteredStudents.forEach(student => student.firstName && values.add(student.firstName));
        return Array.from(values).sort();
    }, [filteredStudents]);

    const patronymicOptions = useMemo(() => {
        const values = new Set();
        filteredStudents.forEach(student => student.patronymic && values.add(student.patronymic));
        return Array.from(values).sort();
    }, [filteredStudents]);

    const groupOptions = useMemo(() => {
        return groups.map(group => ({
            id: group.id,
            name: `${group.id}`
        }));
    }, [groups]);

    return (
        <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col" style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}>
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
                    Список студентов
                </h2>
    
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: getColumnWidth('lastName', '150px') }}/>
                                <col style={{ width: getColumnWidth('firstName', '150px') }}/>
                                <col style={{ width: getColumnWidth('patronymic', '150px') }}/>
                                <col style={{ width: getColumnWidth('groupId', '120px') }}/>
                                <col style={{ width: '70px' }}/>
                            </colgroup>
                            <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
  {/* Заголовки столбцов */}
  <tr className="h-[40px]">
    <th className="px-4 text-left cursor-pointer rounded-tl-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate">
      <div className="flex items-center h-full" onClick={() => handleSort("lastName")}>
        Фамилия {sortColumn === "lastName" && (sortDirection === "asc" ? "▲" : "▼")}
      </div>
    </th>
    <th className="px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate">
      <div className="flex items-center h-full" onClick={() => handleSort("firstName")}>
        Имя {sortColumn === "firstName" && (sortDirection === "asc" ? "▲" : "▼")}
      </div>
    </th>
    <th className="px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate">
      <div className="flex items-center h-full" onClick={() => handleSort("patronymic")}>
        Отчество {sortColumn === "patronymic" && (sortDirection === "asc" ? "▲" : "▼")}
      </div>
    </th>
    <th className="px-4 text-left cursor-pointer border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate">
      <div className="flex items-center h-full" onClick={() => handleSort("groupId")}>
        Группа {sortColumn === "groupId" && (sortDirection === "asc" ? "▲" : "▼")}
      </div>
    </th>
    <th className="px-4 text-center rounded-tr-lg border-b-0 hover:bg-gray-400 transition-colors duration-200 truncate">
      <div className="flex items-center justify-center h-full">
        Действия
      </div>
    </th>
  </tr>

  {/* Фильтры под заголовками */}
  <tr className="h-[40px]">
    <td className="px-2 border-b-0 rounded-bl-lg">
      <div className="flex items-center h-full space-x-1">
        <SearchableSelect
          options={lastNameOptions}
          value={filters.lastName}
          onChange={(value) => handleFilterChange('lastName', value)}
          placeholder="Фильтр"
          formatOption={(option) => option}
        />
        {filters.lastName && (
          <button className="text-gray-500 hover:text-red-600 transition" onClick={() => handleFilterChange('lastName', '')}>
            ✕
          </button>
        )}
      </div>
    </td>
    <td className="px-2 border-b-0">
      <div className="flex items-center h-full space-x-1">
        <SearchableSelect
          options={firstNameOptions}
          value={filters.firstName}
          onChange={(value) => handleFilterChange('firstName', value)}
          placeholder="Фильтр"
          formatOption={(option) => option}
        />
        {filters.firstName && (
          <button className="text-gray-500 hover:text-red-600 transition" onClick={() => handleFilterChange('firstName', '')}>
            ✕
          </button>
        )}
      </div>
    </td>
    <td className="px-2 border-b-0">
      <div className="flex items-center h-full space-x-1">
        <SearchableSelect
          options={patronymicOptions}
          value={filters.patronymic}
          onChange={(value) => handleFilterChange('patronymic', value)}
          placeholder="Фильтр"
          formatOption={(option) => option}
        />
        {filters.patronymic && (
          <button className="text-gray-500 hover:text-red-600 transition" onClick={() => handleFilterChange('patronymic', '')}>
            ✕
          </button>
        )}
      </div>
    </td>
    <td className="px-2 border-b-0">
      <div className="flex items-center h-full space-x-1">
        <SearchableSelect
          options={groupOptions}
          value={filters.groupId}
          onChange={(value) => handleFilterChange('groupId', value)}
          placeholder="Фильтр"
          formatOption={(option) => option.name}
          getOptionValue={(option) => option.id}
        />
        {filters.groupId && (
          <button className="text-gray-500 hover:text-red-600 transition" onClick={() => handleFilterChange('groupId', '')}>
            ✕
          </button>
        )}
      </div>
    </td>
    <td className="px-2 border-b-0 rounded-br-lg" />
  </tr>
</thead>


                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="py-4 text-center">Загрузка...</td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan="5" className="py-4 text-center text-red-500">
                                            Ошибка загрузки: {error.message}
                                        </td>
                                    </tr>
                                ) : sortedStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-4 text-center">Нет данных о студентах</td>
                                    </tr>
                                ) : (
                                    sortedStudents.map((student, index) => (
                                        <tr
                                            key={student.id || `student-${index}`}
                                            className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"} border-b-0`}
                                        >
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                                                title={student.lastName}
                                                onClick={() => handleCellClick("Фамилия", student.lastName)}
                                            >
                                                {student.lastName}
                                            </td>
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                title={student.firstName}
                                                onClick={() => handleCellClick("Имя", student.firstName)}
                                            >
                                                {student.firstName}
                                            </td>
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                title={student.patronymic}
                                                onClick={() => handleCellClick("Отчество", student.patronymic)}
                                            >
                                                {student.patronymic || "-"}
                                            </td>
                                            <td
                                                className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
                                                title={getGroupName(student.groupId)}
                                                onClick={() => handleCellClick("Группа", getGroupName(student.groupId))}
                                            >
                                                {getGroupName(student.groupId)}
                                            </td>
                                            <td 
                                                className="py-2 px-2 text-center rounded-r-lg truncate"
                                            >
                                                <button
                                                    className="h-[40px] px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition truncate w-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditStudent(student);
                                                    }}
                                                >
                                                    Изменить
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
    
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        className="h-[40px] px-6 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                        onClick={handleCreateStudent}
                    >
                        Создать студента
                    </button>
                    <button
                        className="h-[40px] px-6 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                        onClick={onCancel}
                    >
                        Назад
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

            {editingStudent && <EditStudentModal student={editingStudent} onClose={handleCloseModal} />}
            {isCreateModalOpen && <CreateStudentModal onClose={handleCloseCreateModal} />}
        </>
    );
};

export default StudentTable;