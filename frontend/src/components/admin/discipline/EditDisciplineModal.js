"use client";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateDiscipline, deleteDiscipline, hasDisciplineDependencies } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';

const EditDisciplineModal = ({ discipline, onClose }) => {
    const [localDiscipline, setLocalDiscipline] = useState({
        id: "",
        name: "",
        isPractice: false
    });
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    const updateDisciplineMutation = useMutation({
        mutationFn: ({ id, disciplineData }) => updateDiscipline(id, disciplineData),
        onSuccess: () => {
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при обновлении дисциплины:", error);
            setWarningText(error.message || "Ошибка при обновлении дисциплины. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const checkDependenciesMutation = useMutation({
        mutationFn: hasDisciplineDependencies,
        onSuccess: (hasDependencies) => {
            if (hasDependencies) {
                setIsConfirmOpen(false);
                setWarningText("Удаление невозможно, так как существуют связанные оценки.");
                setIsWarningOpen(true);
            } else {
                deleteDisciplineMutation.mutate(localDiscipline.id);
            }
        },
        onError: (error) => {
            console.error("Ошибка при проверке зависимостей:", error);
            setIsConfirmOpen(false);
            setWarningText("Не удалось проверить зависимости дисциплины. Удаление отменено.");
            setIsWarningOpen(true);
        }
    });

    const deleteDisciplineMutation = useMutation({
        mutationFn: deleteDiscipline,
        onSuccess: () => {
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при удалении дисциплины:", error);
            setWarningText(error.message || "Произошла ошибка при удалении дисциплины.");
            setIsWarningOpen(true);
        }
    });

    useEffect(() => {
        if (discipline) {
            setLocalDiscipline({
                id: discipline.id,
                name: discipline.name,
                isPractice: discipline.isPractice
            });
        }
    }, [discipline]);

    const handleChange = (e, field) => {
        const value = e.target.value;
        setLocalDiscipline(prev => ({
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

    const handlePracticeChange = (e) => {
        setLocalDiscipline(prev => ({
            ...prev,
            isPractice: e.target.checked,
        }));
    };

    const handleSave = async () => {
        const errors = {};
        
        if (!localDiscipline.id) {
            errors.id = "Укажите ID дисциплины";
        }
        
        if (!localDiscipline.name) {
            errors.name = "Укажите название дисциплины";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        updateDisciplineMutation.mutate({ 
            id: discipline.id,
            disciplineData: localDiscipline
        });
    };

    const handleDelete = async () => {
        checkDependenciesMutation.mutate(localDiscipline.id);
    };

    if (!discipline) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Редактирование дисциплины</h2>
                        <button
                            className="text-gray-500 hover:text-gray-700 transition"
                            onClick={() => onClose(false)}
                            title="Закрыть"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ID дисциплины</label>
                            <input
                                type="text"
                                value={localDiscipline.id}
                                onChange={(e) => handleChange(e, "id")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.id ? "border-red-500" : ""
                                }`}
                                placeholder="Введите ID дисциплины"
                            />
                            {validationErrors.id && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.id}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Название дисциплины</label>
                            <input
                                type="text"
                                value={localDiscipline.name}
                                onChange={(e) => handleChange(e, "name")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.name ? "border-red-500" : ""
                                }`}
                                placeholder="Введите название дисциплины"
                            />
                            {validationErrors.name && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                            )}
                        </div>
                        <div className="flex items-center mt-4">
    <input
        type="checkbox"
        id="isPractice"
        checked={localDiscipline.isPractice}
        onChange={handlePracticeChange}
        className="appearance-none h-8 w-8 bg-white border-2 border-gray-300 rounded-xl checked:bg-teal-500 checked:border-teal-500 transition-all duration-200 cursor-pointer relative
                   flex items-center justify-center after:content-['✔'] after:text-white after:text-base after:scale-0 checked:after:scale-100 after:transition-transform after:duration-200"
    />
    <label htmlFor="isPractice" className="ml-3 text-sm font-medium text-gray-700">
        Является практикой
    </label>
</div>


                    </div>
    
                    <div className="flex justify-between mt-6">
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleSave}
                            disabled={updateDisciplineMutation.isPending}
                            title="Сохранить изменения"
                        >
                            {updateDisciplineMutation.isPending ? (
                                <>
                                    <span>Сохранение...</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>Сохранить</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                        </button>
    
                        <button
                            className="h-[40px] w-[40px] p-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition flex items-center justify-center"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteDisciplineMutation.isPending}
                            title="Удалить дисциплину"
                        >
                            {deleteDisciplineMutation.isPending ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
    
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                confirmText="Вы действительно хотите удалить дисциплину? Это действие необратимо!"
            />
            
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default EditDisciplineModal;