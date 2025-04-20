"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createStudent, fetchAllGroups } from "../../../utils/api";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const CreateStudentModal = ({ onClose }) => {
    const [localStudent, setLocalStudent] = useState({
        lastName: "",
        firstName: "",
        patronymic: "",
        groupId: ""
    });
    
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 60 * 1000
    });

    const createStudentMutation = useMutation({
        mutationFn: createStudent,
        onSuccess: () => {
            setWarningText("Студент успешно создан!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при создании студента:", error);
            setWarningText(error.message || "Ошибка при создании студента. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

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

    const handleCreate = async () => {
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

        createStudentMutation.mutate(localStudent);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Создание нового студента</h2>
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
                            onClick={handleCreate}
                            disabled={createStudentMutation.isPending}
                        >
                            {createStudentMutation.isPending ? "Создание..." : "Создать"}
                        </button>
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                            onClick={onClose}
                        >
                            Отменить
                        </button>
                    </div>
                </div>
            </div>

            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default CreateStudentModal;