"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllSpecialties, createGroup, importEntitiesFromExcel } from "../../../utils/api";
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const CreateGroupModal = ({ onClose }) => {
    const [localGroup, setLocalGroup] = useState({
        id: "",
        specialtyId: "",
        admissionYear: new Date().getFullYear(),
        educationForm: "дневная",
        educationLevel: 1,
    });
    
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
    const [facultyId, setFacultyId] = useState("");
    const [fileKey, setFileKey] = useState(Date.now());

    // Получаем список специальностей
    const { data: specialties = [], isLoading: isSpecialtiesLoading } = useQuery({
        queryKey: ['specialties'],
        queryFn: fetchAllSpecialties,
        staleTime: 60 * 1000,
        onSuccess: (data) => {
            if (data.length > 0 && !localGroup.specialtyId) {
                handleSpecialtyChange(data[0].id);
            }
        }
    });

    // Мутация для создания группы
    const createGroupMutation = useMutation({
        mutationFn: createGroup,
        onSuccess: () => {
            setWarningText("Группа успешно создана!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при создании группы:", error);
            setWarningText(error.message || "Ошибка при создании группы. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    // Мутация для импорта групп из Excel
    const importGroupsMutation = useMutation({
        mutationFn: (file) => importEntitiesFromExcel('group', file),
        onSuccess: (data) => {
            if (data.errorCount > 0) {
                setWarningText(`Импорт завершен с ошибками. Успешно: ${data.importedCount}, Ошибок: ${data.errorCount}`);
            } else {
                setWarningText(`Успешно импортировано ${data.importedCount} групп`);
            }
            setIsWarningOpen(true);
            if (data.errorCount === 0) onClose();
        },
        onError: (error) => {
            console.error("Ошибка при импорте групп:", error);
            setWarningText(error.message || "Ошибка при импорте групп. Проверьте формат файла.");
            setIsWarningOpen(true);
        }
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await importGroupsMutation.mutateAsync(file);
            setFileKey(Date.now());
        } catch (error) {
            console.error("Import error:", error);
            setFileKey(Date.now());
        }
    };

    // Обновляем facultyId при изменении специальности
    useEffect(() => {
        if (localGroup.specialtyId) {
            const selectedSpecialty = specialties.find(s => s.id === localGroup.specialtyId);
            if (selectedSpecialty) {
                setFacultyId(selectedSpecialty.facultyId || "");
            }
        }
    }, [localGroup.specialtyId, specialties]);

    const handleChange = (e, field) => {
        const value = e.target.value;
        
        if (field === "id") {
            if (!/^\d*$/.test(value)) return;
            if (value.length > 19) return;
        }

        if (field === "admissionYear") {
            const currentYear = new Date().getFullYear();
            if (value < 2000 || value > currentYear) {
                return;
            }
        }

        setLocalGroup(prev => ({
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

    const handleSpecialtyChange = (selectedSpecialtyId) => {
        setLocalGroup(prev => ({
            ...prev,
            specialtyId: selectedSpecialtyId,
        }));
    };

    const handleCreate = async () => {
        const errors = {};
        const selectedSpecialty = specialties.find(s => s.id === localGroup.specialtyId);
        const yearSuffix = String(localGroup.admissionYear).slice(-2);
        const currentYear = new Date().getFullYear();
        
        // Проверка ID группы
        if (!localGroup.id) {
            errors.id = "Укажите ID группы";
        } else if (!/^\d{8,19}$/.test(localGroup.id)) {
            errors.id = "Должно быть от 8 до 19 цифр";
        } else {
            // Проверка что начинается с facultyId
            if (facultyId && !localGroup.id.startsWith(facultyId)) {
                errors.id = `ID группы должен начинаться с ${facultyId}`;
            }
            // Проверка что заканчивается двумя цифрами года
            if (!localGroup.id.endsWith(yearSuffix)) {
                errors.id = `ID группы должен заканчиваться на ${yearSuffix}`;
            }
        }
        
        // Проверка специальности
        if (!localGroup.specialtyId) {
            errors.specialtyId = "Выберите специальность";
        }
        
        // Проверка года поступления
        if (!localGroup.admissionYear) {
            errors.admissionYear = "Укажите год";
        } else if (localGroup.admissionYear < 2000 || localGroup.admissionYear > currentYear) {
            errors.admissionYear = `Год должен быть между 2000 и ${currentYear}`;
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Если все проверки пройдены, создаем группу
        const groupToCreate = {
            ...localGroup,
            id: BigInt(localGroup.id).toString()
        };
        createGroupMutation.mutate(groupToCreate);
    };

    const showIdHint = () => {
        if (validationErrors.id) return true;
        if (!facultyId || !localGroup.id) return false;
        return !localGroup.id.startsWith(facultyId) || !localGroup.id.endsWith(String(localGroup.admissionYear).slice(-2));
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Создание новой группы</h2>
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
                            <label className="block text-sm font-medium text-gray-700">ID группы</label>
                            <input
                                type="text"
                                value={localGroup.id}
                                onChange={(e) => handleChange(e, "id")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.id ? "border-red-500" : ""
                                }`}
                                placeholder="Введите ID группы"
                            />
                            {showIdHint() && (
                                <p className="text-sm mt-1 text-red-500">
                                    {validationErrors.id || 
                                    `ID должен начинаться с ${facultyId} и заканчиваться на ${String(localGroup.admissionYear).slice(-2)}`}
                                </p>
                            )}
                        </div>
    
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Специальность</label>
                            <SearchableSelect
                                options={specialties}
                                value={localGroup.specialtyId}
                                onChange={handleSpecialtyChange}
                                placeholder="Выберите специальность"
                                formatOption={(option) => option.name}
                                searchBy={(option) => option.name.toLowerCase()}
                                getOptionKey={(option) => option.id}
                                disabled={isSpecialtiesLoading}
                            />
                            {validationErrors.specialtyId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.specialtyId}</p>
                            )}
                        </div>
    
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Год поступления</label>
                            <input
                                type="number"
                                min="2000"
                                max={new Date().getFullYear()}
                                value={localGroup.admissionYear}
                                onChange={(e) => handleChange(e, "admissionYear")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.admissionYear ? "border-red-500" : ""
                                }`}
                                placeholder="Введите год поступления"
                            />
                            {validationErrors.admissionYear && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.admissionYear}</p>
                            )}
                        </div>
    
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Форма обучения</label>
                            <SearchableSelect
                                options={[
                                    { value: "дневная", label: "Дневная" },
                                    { value: "заочная", label: "Заочная" },
                                    { value: "дистанционная", label: "Дистанционная" },
                                ]}
                                value={localGroup.educationForm}
                                onChange={(val) => setLocalGroup(prev => ({ ...prev, educationForm: val }))}
                                placeholder="Выберите форму"
                                formatOption={(option) => option.label}
                                searchBy={(option) => option.label.toLowerCase()}
                                getOptionKey={(option) => option.value}
                            />
                        </div>
    
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ступень обучения</label>
                            <SearchableSelect
                                options={[
                                    { value: 1, label: "Бакалавриат" },
                                    { value: 2, label: "Магистратура" },
                                ]}
                                value={localGroup.educationLevel}
                                onChange={(val) => setLocalGroup(prev => ({ ...prev, educationLevel: val }))}
                                placeholder="Выберите ступень"
                                formatOption={(option) => option.label}
                                searchBy={(option) => option.label.toLowerCase()}
                                getOptionKey={(option) => option.value}
                            />
                        </div>
                    </div>
    
                    <div className="flex justify-between mt-6">
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleCreate}
                            disabled={createGroupMutation.isPending}
                        >
                            {createGroupMutation.isPending ? (
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

                        {/* Кнопка импорта */}
                        <div className="relative">
                            <input
                                type="file"
                                id="excel-import"
                                key={fileKey}
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="excel-import"
                                className={`h-[40px] px-4 flex items-center gap-2 rounded-lg shadow-md transition cursor-pointer
                                    ${importGroupsMutation.isPending 
                                        ? 'bg-gray-300 cursor-wait' 
                                        : 'bg-[#217346] hover:bg-[#1a5f38] text-white border border-[#1a5f38]'}
                                    `}
                                disabled={importGroupsMutation.isPending}
                            >
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
                                
                                {importGroupsMutation.isPending ? (
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

export default CreateGroupModal;