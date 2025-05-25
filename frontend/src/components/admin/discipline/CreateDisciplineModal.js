"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createDiscipline, importEntitiesFromExcel } from "../../../utils/api";
import WarningModal from '../../WarningModal';

const CreateDisciplineModal = ({ onClose }) => {
    const [localDiscipline, setLocalDiscipline] = useState({
        id: "",
        name: "",
        isPractice: false
    });
    
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
const [fileKey, setFileKey] = useState(Date.now()); // Добавьте это в состояние компонента
    const createDisciplineMutation = useMutation({
        mutationFn: createDiscipline,
        onSuccess: () => {
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при создании дисциплины:", error);
            setWarningText(error.message || "Ошибка при создании дисциплины. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const importDisciplinesMutation = useMutation({
        mutationFn: (file) => importEntitiesFromExcel('discipline', file),
        onSuccess: (data) => {
            if (data.errorCount > 0) {
                setWarningText(`Импорт завершен с ошибками. Успешно: ${data.importedCount}, Ошибок: ${data.errorCount}`);
            } else {
                setWarningText(`Успешно импортировано ${data.importedCount} дисциплин`);
            }
            setIsWarningOpen(true);
            if (data.errorCount === 0) onClose();
        },
        onError: (error) => {
            console.error("Ошибка при импорте дисциплин:", error);
            setWarningText(error.message || "Ошибка при импорте дисциплин. Проверьте формат файла.");
            setIsWarningOpen(true);
        }
    });

const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        await importDisciplinesMutation.mutateAsync(file);
        // Сбросить значение input после успешной или неудачной загрузки
        setFileKey(Date.now());
    } catch (error) {
        console.error("Import error:", error);
        // Сбросить значение input даже при ошибке
        setFileKey(Date.now());
    }
};

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

    const handleCreate = async () => {
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

        createDisciplineMutation.mutate(localDiscipline);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Создание новой дисциплины</h2>
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
                        {/* Кнопка создания (остается слева) */}
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleCreate}
                            disabled={createDisciplineMutation.isPending}
                        >
                            {createDisciplineMutation.isPending ? (
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

                        {/* Кнопка импорта (перенесена вправо) */}
                        <div className="relative">
                           <input
                                type="file"
                                id="excel-import"
                                key={fileKey} // Добавлен key для сброса
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="excel-import"
                                className={`h-[40px] px-4 flex items-center gap-2 rounded-lg shadow-md transition cursor-pointer
                                    ${importDisciplinesMutation.isPending 
                                        ? 'bg-gray-300 cursor-wait' 
                                        : 'bg-[#217346] hover:bg-[#1a5f38] text-white border border-[#1a5f38]'}
                                    `}
                                disabled={importDisciplinesMutation.isPending}
                            >
                                {/* Иконка Excel */}
                                <div className="relative w-5 h-5">
                                    <div className="absolute inset-0 bg-white border border-[#217346] rounded-sm shadow-sm flex items-center justify-center">
                                        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px] p-[1px]">
                                            {Array.from({ length: 9 }).map((_, idx) => (
                                                <div key={idx} className={`w-full h-full ${idx === 4 ? 'bg-white' : 'bg-[#217346]'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-[#217346] text-white text-[8px] font-bold px-[2px] py-[1px] rounded-sm shadow-md">
                                        X
                                    </div>
                                </div>
                                
                                {importDisciplinesMutation.isPending ? (
                                    <span className="text-base">Импорт...</span>
                                ) : (
                                    <span className="text-base">Импорт</span>
                                )}
                            </label>
                        </div>
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

export default CreateDisciplineModal;