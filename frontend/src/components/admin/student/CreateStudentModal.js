"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createStudent, fetchAllGroups } from "../../../utils/api";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const CreateStudentModal = ({ onClose }) => {
    const [localStudent, setLocalStudent] = useState({
        studentId: "",
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
            onClose(); // Просто закрываем модальное окно
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
        
        if (!localStudent.studentId) {
            errors.studentId = "Укажите ID студента";
        }
        
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
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Создание нового студента</h2>
                        <button
                            className="text-gray-500 hover:text-gray-700 transition"
                            onClick={onClose}
                            title="Закрыть"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ID студента</label>
                            <input
                                type="text"
                                value={localStudent.studentId}
                                onChange={(e) => handleChange(e, "studentId")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.studentId ? "border-red-500" : ""
                                }`}
                                placeholder="Введите ID студента"
                            />
                            {validationErrors.studentId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.studentId}</p>
                            )}
                        </div>

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
                                formatOption={(option) => option.id}
                                searchBy={(option) => option.id.toLowerCase()}
                                getOptionKey={(option) => option.id}
                                disabled={isGroupsLoading}
                            />
                            {validationErrors.groupId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.groupId}</p>
                            )}
                        </div>
                    </div>
    
                    <div className="flex justify-between mt-6">
                        {/* Кнопка сохранения */}
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleCreate}
                            disabled={createStudentMutation.isPending}
                        >
                            {createStudentMutation.isPending ? (
                                <>
                                    <span>Создание...</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>Создать</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
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