"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchAllSpecialties, updateGroup, deleteGroup, hasGroupDependencies } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const EditGroupModal = ({ group, onClose }) => {
    const [localGroup, setLocalGroup] = useState({
        id: "",
        specialtyId: "",
        admissionYear: new Date().getFullYear(),
        educationForm: "дневная",
        educationLevel: 1,
    });
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
            if (data.length > 0 && group?.specialtyId) {
                handleSpecialtyChange(group.specialtyId);
            }
        }
    });

    // Мутации для обновления и удаления
    const updateGroupMutation = useMutation({
        mutationFn: ({ id, groupData }) => updateGroup(id, groupData),
        onSuccess: () => {
            setWarningText("Группа успешно обновлена!");
            setIsWarningOpen(true);
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при обновлении группы:", error);
            setWarningText(error.message || "Ошибка при обновлении группы. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const checkDependenciesMutation = useMutation({
        mutationFn: hasGroupDependencies,
        onSuccess: (hasDependencies) => {
            if (hasDependencies) {
                setIsConfirmOpen(false);
                setWarningText("Удаление невозможно, так как существуют связанные студенты или ведомости.");
                setIsWarningOpen(true);
            } else {
                deleteGroupMutation.mutate(localGroup.id);
            }
        },
        onError: (error) => {
            console.error("Ошибка при проверке зависимостей:", error);
            setIsConfirmOpen(false);
            setWarningText("Не удалось проверить зависимости группы. Удаление отменено.");
            setIsWarningOpen(true);
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: deleteGroup,
        onSuccess: () => {
            setWarningText("Группа успешно удалена.");
            setIsWarningOpen(true);
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при удалении группы:", error);
            setWarningText(error.message || "Произошла ошибка при удалении группы.");
            setIsWarningOpen(true);
        }
    });

    // Инициализация состояния при получении группы
    useEffect(() => {
        if (group) {
            setLocalGroup({
                id: group.id,
                specialtyId: group.specialtyId,
                admissionYear: group.admissionYear,
                educationForm: group.educationForm,
                educationLevel: group.educationLevel,
            });
        }
    }, [group]);

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

    const handleSave = async () => {
        const errors = {};
        const selectedSpecialty = specialties.find(s => s.id === localGroup.specialtyId);
        const yearSuffix = String(localGroup.admissionYear).slice(-2);
        
        // Проверка специальности
        if (!localGroup.specialtyId) {
            errors.specialtyId = "Выберите специальность";
        }
        
        // Проверка года поступления
        if (!localGroup.admissionYear) {
            errors.admissionYear = "Укажите год";
        } else if (localGroup.admissionYear < 2000 || localGroup.admissionYear > new Date().getFullYear()) {
            errors.admissionYear = `Год должен быть между 2000 и ${new Date().getFullYear()}`;
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        updateGroupMutation.mutate({ 
            id: localGroup.id, 
            groupData: localGroup 
        });
    };

    const handleDelete = async () => {
        checkDependenciesMutation.mutate(localGroup.id);
    };

    if (!group) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Редактирование группы</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ID группы</label>
                            <input
                                type="text"
                                value={localGroup.id}
                                className="w-full px-2 py-1 border rounded-lg"
                                disabled
                            />
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
                            onClick={handleSave}
                            disabled={updateGroupMutation.isPending}
                        >
                            {updateGroupMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteGroupMutation.isPending}
                        >
                            {deleteGroupMutation.isPending ? "Удаление..." : "Удалить"}
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
                confirmText="Вы действительно хотите удалить группу? Это действие необратимо!"
            />
            
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default EditGroupModal;