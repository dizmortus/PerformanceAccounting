"use client";
import { useState, useMemo,useCallback, useEffect  } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllStudents, fetchAllGroups } from "../../../utils/api";
import EditStudentModal from "./EditStudentModal";
import CreateStudentModal from "./CreateStudentModal";
import SearchableSelect from '../SearchableSelect';

const StudentTable = ({ onCancel }) => {
    const [editingStudent, setEditingStudent] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [filters, setFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedFilters = localStorage.getItem("students_filters");
            return savedFilters ? JSON.parse(savedFilters) : {
                id: '',
                lastName: '',
                firstName: '',
                patronymic: '',
                groupId: ''
            };
            
        }
        return {
            lastName: '',
            firstName: '',
            patronymic: '',
            groupId: ''
        };
    });

    useEffect(() => {
        localStorage.setItem("students_filters", JSON.stringify(filters));
    }, [filters]);

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
                (!filters.id || student.id?.toString() === (filters.id)) &&
                (!filters.lastName || student.lastName?.toLowerCase()  ===  (filters.lastName.toLowerCase())) &&
                (!filters.firstName || student.firstName?.toLowerCase()  ===  (filters.firstName.toLowerCase())) &&
                (!filters.patronymic || (student.patronymic && student.patronymic.toLowerCase()  ===  (filters.patronymic.toLowerCase()))) &&
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

    const handleFilterChange = (column, value) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const getFilterOptions = useCallback((column) => {
        if (!studentsData) return [];
    
        const students = studentsData?.data || studentsData || [];
    
        return students.filter(student => {
            // Применяем все фильтры, кроме текущего
            return Object.entries(filters).every(([key, value]) => {
                if (key === column || !value) return true;
    
                if (key === "groupId") {
                    return student[key] === value;
                }
    
                return student[key]?.toLowerCase().includes(value.toLowerCase());
            });
        });
    }, [studentsData, filters]);
    
    const lastNameOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('lastName').forEach(student => student.lastName && values.add(student.lastName));
        return Array.from(values).sort();
    }, [getFilterOptions]);
    
    const firstNameOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('firstName').forEach(student => student.firstName && values.add(student.firstName));
        return Array.from(values).sort();
    }, [getFilterOptions]);
    
    const patronymicOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('patronymic').forEach(student => student.patronymic && values.add(student.patronymic));
        return Array.from(values).sort();
    }, [getFilterOptions]);
    
    const idOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('id').forEach(student => student.id && values.add(student.id));
        return Array.from(values).sort((a, b) => a - b); // сортировка по числовым ID
    }, [getFilterOptions]);
    
    const groupOptions = useMemo(() => {
        const values = new Set();
        getFilterOptions('groupId').forEach(student => student.groupId && values.add(student.groupId));
        return groups
            .filter(group => values.has(group.id))
            .map(group => ({
                id: group.id,
                name: `${group.id}`
            }));
    }, [getFilterOptions, groups]);

  return (
    <>
      <div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-7xl bg-white p-6 rounded-lg shadow-lg flex flex-col"
        style={{ height: "calc(100vh - 2rem)", overflow: "hidden" }}
      >
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
          Список студентов
        </h2>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-gray-900 border-collapse table-fixed">
              <colgroup>
                <col style={{ width: getColumnWidth("id", "100px") }} />
                <col style={{ width: getColumnWidth("lastName", "200px") }} />
                <col style={{ width: getColumnWidth("firstName", "200px") }} />
                <col style={{ width: getColumnWidth("patronymic", "200px") }} />
                <col style={{ width: getColumnWidth("groupId", "150px") }} />
                <col style={{ width: "40px" }} />
              </colgroup>
              <thead className="sticky top-0 bg-gray-300 rounded-t-lg z-10">
                <tr className="h-[40px]">
                  {["id", "lastName", "firstName", "patronymic", "groupId"].map((col, i) => (
                    <th
                      key={col}
                      className={`px-4 text-left cursor-pointer ${
                        i === 0 ? "rounded-tl-lg" : ""
                      } hover:bg-gray-400 border-b-0 transition-colors duration-200 truncate`}
                    >
                      <div className="flex items-center h-full" onClick={() => handleSort(col)}>
                        {{
                          id: "ID",
                          lastName: "Фамилия",
                          firstName: "Имя",
                          patronymic: "Отчество",
                          groupId: "Группа",
                        }[col]}{" "}
                        {sortColumn === col && (sortDirection === "asc" ? "▲" : "▼")}
                      </div>
                    </th>
                  ))}

                  <th className="px-2 text-center border-b-0 rounded-tr-lg rounded-br-lg " colSpan="1" rowSpan="2">
                    <div className="flex justify-center">
                      <button
                        className="h-[40px] w-[40px] bg-teal-500 text-white rounded-lg shadow hover:bg-teal-600 transition flex items-center justify-center"
                        onClick={handleCreateStudent}
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
                    { field: "id", options: [] }, // ID не фильтруется
                    { field: "lastName", options: lastNameOptions },
                    { field: "firstName", options: firstNameOptions },
                    { field: "patronymic", options: patronymicOptions },
                    { field: "groupId", options: groupOptions, isGroup: true },
                  ].map(({ field, options, isGroup }, i) => (
                    <td key={field} className={`px-2 border-b-0 ${i === 0 ? "rounded-bl-lg" : ""}`}>
                      <div className="flex items-center w-full space-x-2">
                        <div className="flex-1">
                        {field === "id" ? (
  <SearchableSelect
    options={idOptions}
    value={filters.id}
    onChange={(value) => handleFilterChange("id", value)}
    placeholder="Фильтр"
    formatOption={(option) => option}
    getOptionValue={(option) => option}
    className="w-full"
    fontSize="sm"
  />
) : (


                            <SearchableSelect
                              options={options}
                              value={filters[field]}
                              onChange={(value) => handleFilterChange(field, value)}
                              placeholder="Фильтр"
                              formatOption={(option) => (isGroup ? option.name : option)}
                              getOptionValue={(option) => (isGroup ? option.id : option)}
                              className="w-full"
                              fontSize="sm"
                            />
                          )}
                        </div>
                        {filters[field]  && (
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
                    <td colSpan="6" className="py-4 text-center">
                      Загрузка...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-red-500">
                      Ошибка загрузки: {error.message}
                    </td>
                  </tr>
                ) : sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center">
                      Нет данных о студентах
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((student, index) => (
                    <tr
                      key={student.id || `student-${index}`}
                      className={`${
                        index % 2 === 0 ? "bg-gray-100" : "bg-gray-200"
                      } border-b-0`}
                    >
                      <td
                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-l-lg truncate"
                        title={student.id}
                        onClick={() => handleCellClick("ID", student.id)}
                      >
                        {student.id}
                      </td>
                      <td
                        className="py-3 px-4 hover:bg-gray-50 cursor-pointer truncate"
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
                        className="py-2 px-2 text-center rounded-r-lg truncate relative hover:bg-gray-50 cursor-pointer"
                        title="Редактировать"
                        onClick={() => handleEditStudent(student)}
                      >
                        <div className="flex justify-center">
                          <button
                            className="h-[40px] w-[40px] flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStudent(student);
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

      {/* Модальное окно просмотра содержимого ячейки */}
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

      {editingStudent && <EditStudentModal student={editingStudent} onClose={handleCloseModal} />}
      {isCreateModalOpen && <CreateStudentModal onClose={handleCloseCreateModal} />}
    </>
  );
};

export default StudentTable;