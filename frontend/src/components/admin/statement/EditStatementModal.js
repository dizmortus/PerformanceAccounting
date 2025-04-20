'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { updateStatement, deleteStatement, fetchAllTeachers, fetchAllDisciplines, fetchAllGroups } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';
import { fetchStatementByGroupDisciplineSemester } from "../../../utils/api";

const EditStatementModal = ({ statement, onClose }) => {
    const [localStatement, setLocalStatement] = useState(statement || {});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    
    useEffect(() => {
        const fetchAndSetStatementData = async () => {
            if (
                localStatement.assessmentType === "курсовой проект" &&
                localStatement.groupId &&
                localStatement.disciplineId &&
                localStatement.semester
            ) {
                setIsSearchingStatement(true);
                try {
                    const existingStatement = await fetchStatementByGroupDisciplineSemester(
                        localStatement.groupId,
                        localStatement.disciplineId,
                        localStatement.semester
                    );
    
                    // Only update if we found a different statement
                    if (existingStatement && existingStatement.id !== localStatement.id) {
                        setLocalStatement(prev => ({
                            ...prev,
                            practiceHours: existingStatement.practiceHours || "0",
                            creditUnits: existingStatement.creditUnits || "0"
                        }));
                    } else if (!existingStatement) {
                        setLocalStatement(prev => ({
                            ...prev,
                            practiceHours: "0",
                            creditUnits: "0"
                        }));
                    }
                } catch (error) {
                    console.error("Ошибка при поиске ведомости:", error);
                    setLocalStatement(prev => ({
                        ...prev,
                        practiceHours: "0",
                        creditUnits: "0"
                    }));
                } finally {
                    setIsSearchingStatement(false);
                }
            }
        };
    
        fetchAndSetStatementData();
    }, [localStatement.assessmentType, localStatement.groupId, localStatement.disciplineId, localStatement.semester, localStatement.id]);
    // Assessment type options with proper capitalization
    const assessmentTypeOptions = [
        "Зачет",
        "Экзамен",
        "Практика",
        "Курсовой проект",
        "Дифференцированный зачет"
    ];
    const [isSearchingStatement, setIsSearchingStatement] = useState(false);
    // Fetch data with React Query
    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: fetchAllTeachers,
        staleTime: 60 * 1000
    });

    const { data: disciplinesData = [] } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 60 * 1000,
        select: (data) => data.map(d => ({
            ...d,
            isPractice: d.isPractice || [1, 2, 3].includes(d.id)
        }))
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 60 * 1000
    });

    // Filter disciplines based on assessment type
    const filteredDisciplines = localStatement.assessmentType === "практика" 
        ? disciplinesData.filter(d => d.isPractice)
        : disciplinesData.filter(d => !d.isPractice);

    // Mutations for update and delete
    const updateStatementMutation = useMutation({
        mutationFn: ({ id, data }) => updateStatement(id, data),
        onSuccess: () => {
            setWarningText("Ведомость успешно обновлена!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при сохранении ведомости:", error);
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
        const firstName = teacher.firstName || '';
        const patronymic = teacher.patronymic || '';
        return `${lastName} ${firstName} ${patronymic}`.trim();
    };
    const handleChange = (e, field) => {
        // Prevent changes to assessmentType if it's курсовой проект or практика
        if (field === "assessmentType" && 
            ["курсовой проект", "практика"].includes(localStatement.assessmentType)) {
            return;
        }
    
        // Prevent changes to practiceHours and creditUnits when assessmentType is "курсовой проект"
        if (localStatement.assessmentType === "курсовой проект" && 
            (field === "practiceHours" || field === "creditUnits")) {
            return;
        }
    
        const value = e.target.value;
        const newState = {
            ...localStatement,
            [field]: value,
        };
    
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
      const isAssessmentTypeDisabled = () => {
        return ["курсовой проект", "практика"].includes(localStatement.assessmentType);
      };
    const handleSave = async (overrideData = null) => {
        const statementData = overrideData || localStatement;

        const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "creditUnits"];
        const errors = {};

        requiredFields.forEach((field) => {
            if (!statementData[field] && statementData[field] !== 0) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (["зачет", "экзамен", "дифференцированный зачет"].includes(statementData.assessmentType)) {
            if (!statementData.classTeacherLogin) {
                errors.classTeacherLogin = "Преподаватель занятий обязателен для выбранного типа аттестации";
            }
        }

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
            creditUnits: parseInt(statementData.creditUnits),
            classTeacherLogin: ["экзамен", "зачет", "дифференцированный зачет"].includes(statementData.assessmentType)
                ? statementData.classTeacherLogin
                : null
        };

        updateStatementMutation.mutate({ id: statementData.id, data: statementToUpdate });
    };

    const handleDelete = async () => {
        deleteStatementMutation.mutate(localStatement.id);
    };

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
// Get allowed assessment types based on current type
const getAllowedAssessmentTypes = () => {
    const currentType = localStatement.assessmentType;
    
    if (currentType === "курсовой проект" || currentType === "практика") {
      // Can't change from these types
      return [currentType.charAt(0).toUpperCase() + currentType.slice(1)];
    }
    
    // For other types (зачет, экзамен, дифференцированный зачет)
    // Allow switching between these three
    return ["Зачет", "Экзамен", "Дифференцированный зачет"];
  };
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Редактирование ведомости</h2>
                    <div className="space-y-4">
{/* Assessment type dropdown */}
<div>
  <label className="block text-sm font-medium text-gray-700">Тип аттестации</label>
  <SearchableSelect
  options={getAllowedAssessmentTypes()}
  value={localStatement.assessmentType?.charAt(0).toUpperCase() + localStatement.assessmentType?.slice(1) || ""}
  onChange={(value) => handleChange({ target: { value: value.toLowerCase() } }, "assessmentType")}
  placeholder="Выберите тип аттестации"
  error={validationErrors.assessmentType}
  formatOption={(option) => option}
  searchBy={(option) => option.toLowerCase()}
  disabled={isAssessmentTypeDisabled()}
/>
</div>

                        {/* Discipline dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {localStatement.assessmentType === "практика" ? "Практика" : "Дисциплина"}
                            </label>
                            <SearchableSelect
                                options={filteredDisciplines}
                                value={localStatement.disciplineId || ""}
                                onChange={(value) => setLocalStatement({ ...localStatement, disciplineId: value })}
                                placeholder={
                                    localStatement.assessmentType === "практика" ? "Выберите практику" : "Выберите дисциплину"
                                }
                                error={validationErrors.disciplineId}
                                formatOption={(d) => d.name}
                                searchBy={(d) => d.name.toLowerCase()}
                                disabled={!localStatement.assessmentType}
                            />
                        </div>

                        {/* Group dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Группа</label>
                            <SearchableSelect
                                options={groups}
                                value={localStatement.groupId || ""}
                                onChange={(value) => setLocalStatement({ ...localStatement, groupId: value })}
                                placeholder="Выберите группу"
                                error={validationErrors.groupId}
                                formatOption={(group) => group.id}
                                searchBy={(group) => group.id.toLowerCase()}
                            />
                        </div>

                        {/* Teacher dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Преподаватель</label>
                            <SearchableSelect
                                options={teachers}
                                value={localStatement.teacherLogin || ""}
                                onChange={(value) => setLocalStatement({ ...localStatement, teacherLogin: value })}
                                placeholder="Выберите преподавателя"
                                error={validationErrors.teacherLogin}
                                formatOption={formatTeacherName}
                                searchBy={(teacher) =>
                                    `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic}`.toLowerCase()
                                }
                            />
                        </div>

                        {/* Class Teacher - only for certain assessment types */}
                        {["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Преподаватель занятий</label>
                                <SearchableSelect
                                    options={teachers}
                                    value={localStatement.classTeacherLogin || ""}
                                    onChange={(value) => setLocalStatement({ ...localStatement, classTeacherLogin: value })}
                                    placeholder="Выберите преподавателя занятий"
                                    error={validationErrors.classTeacherLogin}
                                    formatOption={formatTeacherName}
                                    searchBy={(teacher) =>
                                        `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic}`.toLowerCase()
                                    }
                                />
                            </div>
                        )}

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

                        {/* Date input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата (необязательно)</label>
                            <input
                                type="date"
                                value={localStatement.date?.split('T')[0] || ""}
                                onChange={(e) => handleChange(e, "date")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.date ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.date && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.date}</p>
                            )}
                        </div>

                        {/* Practice hours and credit units */}
{/* Practice hours and credit units */}
<div className="flex gap-4">
    {/* Practice hours input */}
    <div className="flex-1 relative">
        <label className="block text-sm font-medium text-gray-700">
            Часы практики
            {isSearchingStatement && (
                <span className="ml-2 text-xs text-gray-500">(поиск...)</span>
            )}
        </label>
        <input
            type="number"
            value={localStatement.practiceHours || ""}
            onChange={(e) => handleChange(e, "practiceHours")}
            min="1"
            readOnly={localStatement.assessmentType === "курсовой проект"}
            className={`w-full px-2 py-1 border rounded-lg ${
                validationErrors.practiceHours ? "border-red-500" : "border-gray-300"
            } ${localStatement.assessmentType === "курсовой проект" ? "bg-gray-100" : ""}`}
        />
        {validationErrors.practiceHours && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.practiceHours}</p>
        )}
    </div>

    {/* Credit units input */}
    <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">Зачетные единицы</label>
        <input
            type="number"
            value={localStatement.creditUnits || ""}
            onChange={(e) => handleChange(e, "creditUnits")}
            min="1"
            readOnly={localStatement.assessmentType === "курсовой проект"}
            className={`w-full px-2 py-1 border rounded-lg ${
                validationErrors.creditUnits ? "border-red-500" : "border-gray-300"
            } ${localStatement.assessmentType === "курсовой проект" ? "bg-gray-100" : ""}`}
        />
        {validationErrors.creditUnits && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.creditUnits}</p>
        )}
    </div>
</div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={() => handleSave()}
                            disabled={updateStatementMutation.isPending}
                        >
                            {updateStatementMutation.isPending ? "Сохранение..." : "Сохранить"}
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
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteStatementMutation.isPending}
                        >
                            {deleteStatementMutation.isPending ? "Удаление..." : "Удалить"}
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