"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { updateStatement, deleteStatement, fetchAllTeachers, fetchAllDisciplines, fetchAllGroups } from "../utils/api";
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';

const EditStatementModal = ({ statement, onClose }) => {
    const [localStatement, setLocalStatement] = useState(statement || {});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    // Fetch data with React Query
    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: fetchAllTeachers,
        staleTime: 60 * 1000 // 1 minute
    });

    const { data: disciplinesData = [] } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 60 * 1000,
        select: (data) => data.map(d => ({
            ...d,
            isPractice: d.isPractice || [1, 2, 3].includes(d.id) // Добавляем флаг практики
        }))
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 60 * 1000
    });


    // Mutations for update and delete
    const updateStatementMutation = useMutation({
        mutationFn: ({ id, data }) => updateStatement(id, data),
        onSuccess: () => {
            setValidationErrors({});
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при сохранении ведомости:", error);
            setValidationErrors({});
            setWarningText("Ошибка при обновлении ведомости. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const deleteStatementMutation = useMutation({
        mutationFn: deleteStatement,
        onSuccess: (result) => {
            if (result.success) {
                setWarningText("Ведомость успешно удалена.");
                setIsWarningOpen(true);
                onClose();
            } else {
                setWarningText(result.error);
                setIsWarningOpen(true);
            }
        },
        onError: (error) => {
            console.error("Ошибка при удалении ведомости:", error);
            setWarningText("Произошла ошибка при удалении ведомости.");
            setIsWarningOpen(true);
        }
    });

    // Update local state when prop changes
    useEffect(() => {
        setLocalStatement(statement || {});
    }, [statement]);

    const formatTeacherName = (teacher) => {
        const lastName = teacher.lastName || '';
        const firstNameInitial = teacher.firstName ? teacher.firstName[0] : '';
        const patronymicInitial = teacher.patronymic ? teacher.patronymic[0] : '';
        return `${lastName} ${firstNameInitial}.${patronymicInitial}.`;
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

 // Фильтруем дисциплины в зависимости от типа аттестации
 const filteredDisciplines = localStatement.assessmentType === "практика" 
 ? disciplinesData.filter(d => d.isPractice)
 : disciplinesData.filter(d => !d.isPractice);

// ... (остальной код остается без изменений до handleChange)

const handleChange = (e, field) => {
 const value = e.target.value;
 const newState = {
     ...localStatement,
     [field]: value,
 };

 // Если изменился тип аттестации, сбрасываем выбранную дисциплину, если она не подходит
 if (field === "assessmentType") {
     const selectedDiscipline = disciplinesData.find(d => d.id === newState.disciplineId);
     if ((value === "практика" && !selectedDiscipline?.isPractice) || 
         (value !== "практика" && selectedDiscipline?.isPractice)) {
         newState.disciplineId = "";
     }
 }

 setLocalStatement(newState);

 if (validationErrors[field]) {
     setValidationErrors(prev => ({
         ...prev,
         [field]: "",
     }));
 }
};

const handleSave = async (overrideData = null) => {
    const statementData = overrideData || localStatement;

    const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "date", "creditUnits"];
    const errors = {};

    requiredFields.forEach((field) => {
        if (!statementData[field] && statementData[field] !== 0) {
            errors[field] = "Это поле обязательно для заполнения";
        }
    });

    if (statementData.semester < 1 || statementData.semester > 10) {
        errors.semester = "Семестр должен быть числом от 1 до 10";
    }

    if (statementData.practiceHours <= 0) {
        errors.practiceHours = "Часы практики должны быть больше 0";
    }

    if (statementData.creditUnits <= 0) {
        errors.creditUnits = "Зачетные единицы должны быть больше 0";
    }

    if (statementData.date && isNaN(new Date(statementData.date).getTime())) {
        errors.date = "Некорректная дата";
    }

    if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
    }

    const statementToUpdate = {
        ...statementData,
        date: statementData.date ? new Date(statementData.date).toISOString() : null,
        creditUnits: parseInt(statementData.creditUnits)
    };

    updateStatementMutation.mutate({ id: statementData.id, data: statementToUpdate });
};


    const handleDelete = async () => {
        deleteStatementMutation.mutate(localStatement.id);
    };

    if (!statement) return null;

    const getClearedStatement = () => ({
        ...statement, 
        list: null  
    });

    const handleClearList = () => {
        setIsClearConfirmOpen(true);
    };

    const confirmClearList = () => {
        handleSave(getClearedStatement());
        setIsClearConfirmOpen(false);
    };


    if (!statement) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Редактирование ведомости</h2>
                    <div className="space-y-4">
                        {/* Teacher dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Преподаватель</label>
                            <select
                                value={localStatement.teacherLogin || ""}
                                onChange={(e) => handleChange(e, "teacherLogin")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.teacherLogin ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">Выберите преподавателя</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher.login} value={teacher.login}>
                                        {formatTeacherName(teacher)}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.teacherLogin && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.teacherLogin}</p>
                            )}
                        </div>
    
                        {/* Discipline dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {localStatement.assessmentType === "практика" ? "Практика" : "Дисциплина"}
                            </label>
                            <select
                                value={localStatement.disciplineId || ""}
                                onChange={(e) => handleChange(e, "disciplineId")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.disciplineId ? "border-red-500" : ""
                                }`}
                                disabled={!localStatement.assessmentType}
                            >
                                <option value="">
                                    {localStatement.assessmentType === "практика" 
                                        ? "Выберите практику" 
                                        : "Выберите дисциплину"}
                                </option>
                                {filteredDisciplines.map((discipline) => (
                                    <option 
                                        key={discipline.id} 
                                        value={discipline.id}
                                    >
                                        {discipline.name}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.disciplineId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.disciplineId}</p>
                            )}
                        </div>
    
                        {/* Group dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Группа</label>
                            <select
                                value={localStatement.groupId || ""}
                                onChange={(e) => handleChange(e, "groupId")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.groupId ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">Выберите группу</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.id}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.groupId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.groupId}</p>
                            )}
                        </div>
    
                        {/* Date input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата</label>
                            <input
                                type="date"
                                value={formatDateForInput(localStatement.date) || ""}
                                onChange={(e) => handleChange(e, "date")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.date ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.date && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.date}</p>
                            )}
                        </div>
    
                        {/* Practice hours input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Часы практики</label>
                            <input
                                type="number"
                                value={localStatement.practiceHours || ""}
                                onChange={(e) => handleChange(e, "practiceHours")}
                                min="1"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.practiceHours ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.practiceHours && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.practiceHours}</p>
                            )}
                        </div>
    
                        {/* Semester input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Семестр</label>
                            <input
                                type="number"
                                value={localStatement.semester || ""}
                                onChange={(e) => handleChange(e, "semester")}
                                min="1"
                                max="10"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.semester ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.semester && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.semester}</p>
                            )}
                        </div>
    
                        {/* Credit units input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Зачетные единицы</label>
                            <input
                                type="number"
                                value={localStatement.creditUnits || ""}
                                onChange={(e) => handleChange(e, "creditUnits")}
                                min="1"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.creditUnits ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.creditUnits && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.creditUnits}</p>
                            )}
                        </div>
    
                        {/* Assessment type dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Тип аттестации</label>
                            <select
                                value={localStatement.assessmentType || ""}
                                onChange={(e) => handleChange(e, "assessmentType")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.assessmentType ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">Выберите тип аттестации</option>
                                <option value="зачет">Зачет</option>
                                <option value="экзамен">Экзамен</option>
                                <option value="практика">Практика</option>
                                <option value="курсовой проект">Курсовой проект</option>
                                <option value="дифференцированный зачет">Дифференцированный зачет</option>
                            </select>
                            {validationErrors.assessmentType && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.assessmentType}</p>
                            )}
                        </div>
                    </div>
    
      
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={() => handleSave()}
                            disabled={updateStatementMutation.isPending}
                        >
                            {updateStatementMutation.isPending ? "Сохранение..." : "Принять"}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteStatementMutation.isPending}
                        >
                            {deleteStatementMutation.isPending ? "Удаление..." : "Удалить"}
                        </button>
                        {localStatement.list && (
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                                onClick={handleClearList}
                                disabled={updateStatementMutation.isPending}
                            >
                                Очистить
                            </button>
                        )}
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                            onClick={onClose}
                        >
                            Отменить
                        </button>
                    </div>
                </div>
            </div>
    
            {/* Modals */}
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                confirmText="Вы действительно хотите удалить ведомость? Это действие необратимо!"
            />
            <ConfirmModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={confirmClearList}
                confirmText="Вы действительно хотите удалить файл ведомости? Это действие необратимо!"
            />
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default EditStatementModal;