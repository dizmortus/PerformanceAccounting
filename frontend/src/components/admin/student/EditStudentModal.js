"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { updateStudent, deleteStudent, hasStudentDependencies, fetchAllGroups } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const EditStudentModal = ({ student, onClose }) => {
    const [localStudent, setLocalStudent] = useState({
        id: "",
        lastName: "",
        firstName: "",
        patronymic: "",
        groupId: ""
    });
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 60 * 1000
    });

    const updateStudentMutation = useMutation({
        mutationFn: ({ id, studentData }) => updateStudent(id, studentData),
        onSuccess: () => {
            setWarningText("Студент успешно обновлен!");
            setIsWarningOpen(true);
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при обновлении студента:", error);
            setWarningText(error.message || "Ошибка при обновлении студента. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const checkDependenciesMutation = useMutation({
        mutationFn: hasStudentDependencies,
        onSuccess: (hasDependencies) => {
            if (hasDependencies) {
                setIsConfirmOpen(false);
                setWarningText("Удаление невозможно, так как существуют связанные оценки или посещения.");
                setIsWarningOpen(true);
            } else {
                deleteStudentMutation.mutate(localStudent.id);
            }
        },
        onError: (error) => {
            console.error("Ошибка при проверке зависимостей:", error);
            setIsConfirmOpen(false);
            setWarningText("Не удалось проверить зависимости студента. Удаление отменено.");
            setIsWarningOpen(true);
        }
    });

    const deleteStudentMutation = useMutation({
        mutationFn: deleteStudent,
        onSuccess: () => {
            setWarningText("Студент успешно удален.");
            setIsWarningOpen(true);
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при удалении студента:", error);
            setWarningText(error.message || "Произошла ошибка при удалении студента.");
            setIsWarningOpen(true);
        }
    });

    useEffect(() => {
        if (student) {
            setLocalStudent({
                id: student.id,
                lastName: student.lastName,
                firstName: student.firstName,
                patronymic: student.patronymic || "",
                groupId: student.groupId
            });
        }
    }, [student]);

    const handleChange = (e, field) => {
        const value = e.target.value;
        setLocalStudent(prev => ({
            ...prev,
            [field]: value,
        }));

        if (validationErrors[field]) {
            setValidationErrors(prev => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    const handleGroupChange = (selectedGroupId) => {
        setLocalStudent(prev => ({
            ...prev,
            groupId: selectedGroupId,
        }));
    };

    const handleSave = async () => {
        const errors = {};
        
        if (!localStudent.lastName) {
            errors.lastName = "Укажите фамилию";
        }
        
        if (!localStudent.firstName) {
            errors.firstName = "Укажите имя";
        }

        if (!localStudent.groupId) {
            errors.groupId = "Выберите группу";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        updateStudentMutation.mutate({ 
            id: localStudent.id, 
            studentData: localStudent 
        });
    };

    const handleDelete = async () => {
        checkDependenciesMutation.mutate(localStudent.id);
    };

    if (!student) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Редактирование студента</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Фамилия</label>
                            <input
                                type="text"
                                value={localStudent.lastName}
                                onChange={(e) => handleChange(e, "lastName")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.lastName ? "border-red-500" : ""
                                }`}
                                placeholder="Введите фамилию"
                            />
                            {validationErrors.lastName && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Имя</label>
                            <input
                                type="text"
                                value={localStudent.firstName}
                                onChange={(e) => handleChange(e, "firstName")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.firstName ? "border-red-500" : ""
                                }`}
                                placeholder="Введите имя"
                            />
                            {validationErrors.firstName && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Отчество</label>
                            <input
                                type="text"
                                value={localStudent.patronymic}
                                onChange={(e) => handleChange(e, "patronymic")}
                                className="w-full px-2 py-1 border rounded-lg"
                                placeholder="Введите отчество (необязательно)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Группа</label>
                            <SearchableSelect
                                options={groups}
                                value={localStudent.groupId}
                                onChange={handleGroupChange}
                                placeholder="Выберите группу"
                                formatOption={(option) => `${option.id} (${option.admissionYear})`}
                                searchBy={(option) => `${option.id} ${option.admissionYear}`.toLowerCase()}
                                getOptionKey={(option) => option.id}
                                disabled={isGroupsLoading}
                            />
                            {validationErrors.groupId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.groupId}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleSave}
                            disabled={updateStudentMutation.isPending}
                        >
                            {updateStudentMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteStudentMutation.isPending}
                        >
                            {deleteStudentMutation.isPending ? "Удаление..." : "Удалить"}
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                            onClick={() => onClose(false)}
                        >
                            Отменить
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                confirmText="Вы действительно хотите удалить студента? Это действие необратимо!"
            />
            
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default EditStudentModal;