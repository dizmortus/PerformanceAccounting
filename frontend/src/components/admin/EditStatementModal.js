"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
    updateStatement, 
    deleteStatement, 
    fetchAllTeachers, 
    fetchAllDisciplines, 
    fetchAllGroups,
    getExactSemester
} from "../../utils/api";
import ConfirmModal from '../ConfirmModal';
import WarningModal from '../WarningModal';
import SearchableSelect from './SearchableSelect';

const EditStatementModal = ({ statement, onClose }) => {
    const [localStatement, setLocalStatement] = useState(statement || {});
    const [isFieldsLocked, setIsFieldsLocked] = useState(false);
    const [currentSemesterId, setCurrentSemesterId] = useState(null);
    const [semesterData, setSemesterData] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    // Логирование при изменении localStatement
    useEffect(() => {
        console.log('Current semester value:', localStatement.semester);
    }, [localStatement.semester]);

    // Проверяем, является ли исходный тип аттестации экзаменом/зачетом
    const isInitialExamType = ["зачет", "экзамен", "дифференцированный зачет"].includes(statement?.assessmentType);

    // Эффект для проверки существующего семестра
    useEffect(() => {
        const checkSemester = async () => {
            console.log('Checking semester for:', {
                groupId: localStatement.groupId,
                disciplineId: localStatement.disciplineId,
                semester: localStatement.semester
            });
            
            if (!localStatement.groupId || !localStatement.disciplineId || !localStatement.semester) {
                setIsFieldsLocked(false);
                setCurrentSemesterId(null);
                setSemesterData(null);
                return;
            }
    
            try {
                const data = await getExactSemester(
                    localStatement.groupId,
                    localStatement.disciplineId,
                    localStatement.semester
                );
    
                if (data) {
                    console.log('Semester data found:', data);
                    setSemesterData(data);
                    setLocalStatement(prev => ({
                        ...prev,
                        practiceHours: data.hours || prev.practiceHours,
                        creditUnits: data.creditUnits || prev.creditUnits,
                        classTeacherLogin: data.journal?.teacherLogin || prev.classTeacherLogin
                    }));
                    setIsFieldsLocked(false);
                    setCurrentSemesterId(data.id);
                } else {
                    console.log('No semester data found');
                    setSemesterData(null);
                    setIsFieldsLocked(false);
                    setCurrentSemesterId(null);
                }
            } catch (error) {
                console.error("Ошибка при проверке семестра:", error);
                setSemesterData(null);
                setIsFieldsLocked(false);
                setCurrentSemesterId(null);
            }
        };
        
        checkSemester();
    }, [localStatement.groupId, localStatement.disciplineId, localStatement.semester]);

    // Определяем, нужно ли показывать поле для преподавателя занятий
    const isExamType = ["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType);
    const showClassTeacher = isExamType;

    // Запросы данных
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

    const handleChange = (e, field) => {
        const value = e.target.value;
        console.log(`Changing ${field} from ${localStatement[field]} to ${value}`);

        const newState = {
            ...localStatement,
            [field]: field === "practiceHours" || field === "creditUnits" ? Number(value) : value,
        };

        if (['groupId', 'disciplineId', 'semester'].includes(field)) {
            console.log('Resetting semester related data');
            setSemesterData(null);
            setIsFieldsLocked(false);
            setCurrentSemesterId(null);
            
            if (field === "groupId" && !value) {
                newState.disciplineId = "";
                newState.semester = "";
            }
        }

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

    // Все возможные типы аттестации
    const allAssessmentTypeOptions = [
        { value: "практика", label: "Практика" },
        { value: "курсовой проект", label: "Курсовой проект" },
        { value: "зачет", label: "Зачет" },
        { value: "экзамен", label: "Экзамен" },
        { value: "дифференцированный зачет", label: "Дифференцированный зачет" }
    ];

    // Типы аттестации для выбора
    const assessmentTypeOptions = isInitialExamType 
        ? allAssessmentTypeOptions.filter(opt => 
            ["зачет", "экзамен", "дифференцированный зачет"].includes(opt.value))
        : allAssessmentTypeOptions;

    const filteredDisciplines = localStatement.assessmentType === "практика" 
        ? disciplinesData.filter(d => d.isPractice)
        : disciplinesData.filter(d => !d.isPractice);

    // Mutations
    const updateStatementMutation = useMutation({
        mutationFn: ({ id, data }) => updateStatement(id, data),
        onSuccess: () => {
            setWarningText("Ведомость успешно обновлена!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при обновлении ведомости:", error);
            setWarningText("Ошибка при обновлении ведомости. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const deleteStatementMutation = useMutation({
        mutationFn: deleteStatement,
        onSuccess: () => {
            setWarningText("Ведомость успешно удалена!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при удалении ведомости:", error);
            setWarningText("Ошибка при удалении ведомости. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });
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

    const formatGroupOption = (group) => group.id;
    const formatDisciplineOption = (discipline) => discipline.name;
    const formatTeacherOption = (teacher) => formatTeacherName(teacher);
    const handleSave = async () => {
        const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "creditUnits"];
        const errors = {};
    
        requiredFields.forEach((field) => {
            if (!localStatement[field] && localStatement[field] !== 0) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });
    
        if (showClassTeacher && !localStatement.classTeacherLogin) {
            errors.classTeacherLogin = "Выберите преподавателя занятий";
        }
    
        if (localStatement.semester < 1 || localStatement.semester > 10) {
            errors.semester = "Семестр должен быть числом от 1 до 10";
        }
    
        if (localStatement.practiceHours <= 0) {
            errors.practiceHours = "Часы практики должны быть больше 0";
        }
    
        if (localStatement.creditUnits <= 0) {
            errors.creditUnits = "Зачетные единицы должны быть больше 0";
        }
    
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
    
        const statementToUpdate = {
            ...localStatement,
            date: localStatement.date ? new Date(localStatement.date).toISOString() : null,
            creditUnits: parseInt(localStatement.creditUnits),
            practiceHours: parseInt(localStatement.practiceHours),
            classTeacherLogin: showClassTeacher ? localStatement.classTeacherLogin : null
        };
    
        updateStatementMutation.mutate({ id: localStatement.id, data: statementToUpdate });
    };

    const handleDelete = () => {
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        deleteStatementMutation.mutate(localStatement.id);
    };

    const handleClearList = () => {
        setIsClearConfirmOpen(true);
    };

    const confirmClearList = () => {
        const clearedStatement = {
            ...localStatement,
            list: null
        };
        updateStatementMutation.mutate({ id: localStatement.id, data: clearedStatement });
        setIsClearConfirmOpen(false);
    };

    if (!statement) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Редактирование ведомости</h2>
                <div className="space-y-4">
 {/* Group dropdown */}
 <div>
                        <label className="block text-sm font-medium text-gray-700">Группа</label>
                        <SearchableSelect
                            options={groups}
                            value={localStatement.groupId}
                            onChange={(e) => handleChange(e, "groupId")}
                            placeholder="Выберите группу"
                            error={validationErrors.groupId}
                            formatOption={(group) => group.id}
                            searchBy={(group) => group.id.toLowerCase()}
                        />
                        {validationErrors.groupId && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.groupId}</p>
                        )}
                    </div>

                    {/* Discipline dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            {localStatement.assessmentType === "практика" ? "Практика" : "Дисциплина"}
                        </label>
                        <SearchableSelect
                            options={filteredDisciplines}
                            value={localStatement.disciplineId}
                            onChange={(e) => handleChange(e, "disciplineId")}
                            placeholder={localStatement.assessmentType === "практика" 
                                ? "Выберите практику" 
                                : "Выберите дисциплину"}
                            error={validationErrors.disciplineId}
                            disabled={!localStatement.assessmentType}
                            formatOption={(discipline) => discipline.name}
                            searchBy={(discipline) => discipline.name.toLowerCase()}
                        />
                        {validationErrors.disciplineId && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.disciplineId}</p>
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

                    {/* Teacher dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Преподаватель</label>
                        <SearchableSelect
                            options={teachers}
                            value={localStatement.teacherLogin}
                            onChange={(e) => handleChange(e, "teacherLogin")}
                            placeholder="Выберите преподавателя"
                            error={validationErrors.teacherLogin}
                            formatOption={formatTeacherOption}
                            searchBy={(teacher) => {
                                const fullName = formatTeacherOption(teacher).toLowerCase();
                                const login = teacher.login.toLowerCase();
                                return `${fullName} ${login}`;
                            }}
                        />
                        {validationErrors.teacherLogin && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.teacherLogin}</p>
                        )}
                    </div>

                    {/* Class teacher dropdown */}
                    {showClassTeacher && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Преподаватель занятий</label>
                            <SearchableSelect
                                options={teachers}
                                value={localStatement.classTeacherLogin || ""}
                                onChange={(e) => handleChange(e, "classTeacherLogin")}
                                placeholder="Выберите преподавателя"
                                error={validationErrors.classTeacherLogin}
                                formatOption={formatTeacherOption}
                                searchBy={(teacher) => {
                                    const fullName = formatTeacherOption(teacher).toLowerCase();
                                    const login = teacher.login.toLowerCase();
                                    return `${fullName} ${login}`;
                                }}
                            />
                            {validationErrors.classTeacherLogin && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.classTeacherLogin}</p>
                            )}
                        </div>
                    )}

                    {/* Assessment type dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Тип аттестации</label>
                        <SearchableSelect
                            options={assessmentTypeOptions.map(opt => ({
                                id: opt.value,
                                name: opt.label,
                                value: opt.value
                            }))}
                            value={localStatement.assessmentType}
                            onChange={(e) => handleChange(e, "assessmentType")}
                            placeholder="Выберите тип аттестации"
                            error={validationErrors.assessmentType}
                            formatOption={(option) => option.name}
                            searchBy={(option) => option.name.toLowerCase()}
                        />
                        {validationErrors.assessmentType && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.assessmentType}</p>
                        )}
                        {isInitialExamType && (
                            <p className="text-gray-500 text-sm mt-1">Доступны только экзамен, зачет или дифференцированный зачет</p>
                        )}
                    </div>

                    {/* Date input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Дата (необязательно)</label>
                        <input
                            type="date"
                            value={formatDateForInput(localStatement.date) || ""}
                            onChange={(e) => handleChange(e, "date")}
                            className={`w-full px-2 py-1 border rounded-lg ${
                                validationErrors.date ? "border-red-500" : "border-gray-300"
                            }`}
                        />
                        {validationErrors.date && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.date}</p>
                        )}
                    </div>

                    {/* Hours and credit units */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Часы практики</label>
                            <input
                                type="number"
                                value={localStatement.practiceHours || ""}
                                onChange={(e) => handleChange(e, "practiceHours")}
                                min="0"
                                step="1"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.practiceHours ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.practiceHours && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.practiceHours}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Зачетные единицы</label>
                            <input
                                type="number"
                                value={localStatement.creditUnits || ""}
                                onChange={(e) => handleChange(e, "creditUnits")}
                                min="0"
                                step="1"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.creditUnits ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.creditUnits && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.creditUnits}</p>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleSave}
                            disabled={updateStatementMutation.isPending}
                        >
                            {updateStatementMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={handleDelete}
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
                onConfirm={confirmDelete}
                confirmText="Вы действительно хотите удалить ведомость? Это действие необратимо!"
            />
            <ConfirmModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={confirmClearList}
                confirmText="Вы действительно хотите очистить ведомость? Это действие необратимо!"
            />
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </div>
    );
};

export default EditStatementModal;