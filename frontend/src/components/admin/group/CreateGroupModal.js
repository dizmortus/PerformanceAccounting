"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllSpecialties, createGroup } from "../../../utils/api";
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
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Создание новой группы</h2>
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

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleCreate}
                            disabled={createGroupMutation.isPending}
                        >
                            {createGroupMutation.isPending ? "Создание..." : "Создать"}
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

export default CreateGroupModal;