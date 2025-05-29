'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
    updateStatement, 
    deleteStatement, 
    fetchAllTeachers, 
    fetchAllDisciplines, 
    fetchAllGroups,
    fetchAllFaculties,
    fetchStatementByGroupDisciplineSemester 
} from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const EditStatementModal = ({ statement, onClose, currentUser }) => {
    // Сначала объявляем хуки состояния
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");
    const [isSearchingStatement, setIsSearchingStatement] = useState(false);

    // Получаем данные о факультетах
    const { data: facultiesResponse = { faculties: [], currentUserFaculty: null } } = useQuery({
        queryKey: ['faculties'],
        queryFn: fetchAllFaculties,
        staleTime: 60 * 1000,
    });

    // Подготавливаем данные для Select
    const facultyOptions = facultiesResponse.faculties?.map(f => ({
        id: f.id,
        label: f.abbreviation,
        fullName: f.name,
        ...f
    })) || [];

    // Определяем факультет по умолчанию
    const defaultFacultyId = facultiesResponse.currentUserFaculty?.id || currentUser?.facultyId;

    // Инициализируем состояние с учетом факультета
    const [localStatement, setLocalStatement] = useState({
        ...(statement || {}),
        teacherFacultyId: statement?.teacherFacultyId || defaultFacultyId || null,
        classTeacherFacultyId: statement?.classTeacherFacultyId || defaultFacultyId || null
    });

    // Получаем список групп
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: fetchAllGroups,
        staleTime: 60 * 1000
    });

    // Получаем текущую группу и максимальный семестр
    const currentGroup = groups.find(g => g.id === localStatement.groupId);
    const maxSemester = currentGroup ? currentGroup.coursesCount * 2 : 10;

    // Устанавливаем семестр по умолчанию при изменении группы
    useEffect(() => {
        if (currentGroup) {
            setLocalStatement(prev => ({
                ...prev,
                semester: currentGroup.currentSemester || prev.semester || ""
            }));
        }
    }, [localStatement.groupId, currentGroup]);

    // Обновляем состояние при получении данных о факультетах
    useEffect(() => {
        if (defaultFacultyId && !localStatement.teacherFacultyId) {
            setLocalStatement(prev => ({
                ...prev,
                teacherFacultyId: defaultFacultyId,
                classTeacherFacultyId: defaultFacultyId
            }));
        }
    }, [defaultFacultyId, localStatement.teacherFacultyId]);

    // Получаем преподавателей для выбранного факультета
    const { data: teachers = [], refetch: refetchTeachers } = useQuery({
        queryKey: ['teachers', localStatement.teacherFacultyId || defaultFacultyId],
        queryFn: () => fetchAllTeachers({ 
            facultyId: localStatement.teacherFacultyId || defaultFacultyId 
        }),
        staleTime: 60 * 1000,
        enabled: !!(localStatement.teacherFacultyId || defaultFacultyId)
    });

    const { data: classTeachers = [], refetch: refetchClassTeachers } = useQuery({
        queryKey: ['classTeachers', localStatement.classTeacherFacultyId || defaultFacultyId],
        queryFn: () => fetchAllTeachers({ 
            facultyId: localStatement.classTeacherFacultyId || defaultFacultyId 
        }),
        staleTime: 60 * 1000,
        enabled: !!(localStatement.classTeacherFacultyId || defaultFacultyId)
    });

    // Остальные хуки запросов
    const { data: disciplinesData = [] } = useQuery({
        queryKey: ['disciplines'],
        queryFn: fetchAllDisciplines,
        staleTime: 60 * 1000,
        select: (data) => data.map(d => ({
            ...d,
            isPractice: d.isPractice || [1, 2, 3].includes(d.id)
        }))
    });

    // Опции для типов аттестации
    const assessmentTypeOptions = [
        "Зачет",
        "Экзамен",
        "Практика",
        "Курсовой проект",
        "Дифференцированный зачет"
    ];

    // Фильтрация дисциплин
    const filteredDisciplines = localStatement.assessmentType === "практика" 
        ? disciplinesData.filter(d => d.isPractice)
        : disciplinesData.filter(d => !d.isPractice);

    // Мутации для обновления и удаления
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

    // Эффект для поиска данных ведомости
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

    // Обновление состояния при изменении пропса statement
    useEffect(() => {
        if (statement) {
            setLocalStatement({
                ...statement,
                teacherFacultyId: statement.teacherFacultyId || defaultFacultyId || null,
                classTeacherFacultyId: statement.classTeacherFacultyId || defaultFacultyId || null
            });
        }
    }, [statement, defaultFacultyId]);

    // Форматирование имени преподавателя
    const formatTeacherName = (teacher) => {
        const lastName = teacher.lastName || '';
        const firstName = teacher.firstName || '';
        const patronymic = teacher.patronymic || '';
        return `${lastName} ${firstName} ${patronymic}`.trim();
    };

    // Обработчик изменений
    const handleChange = (e, field) => {
        if (field === "assessmentType" && 
            ["курсовой проект", "практика"].includes(localStatement.assessmentType)) {
            return;
        }
    
        const value = e.target.value;
        const newState = {
            ...localStatement,
            [field]: value,
        };
    
        if (field === "teacherFacultyId") {
            newState.teacherLogin = "";
            refetchTeachers();
        }

        if (field === "classTeacherFacultyId") {
            newState.classTeacherLogin = "";
            refetchClassTeachers();
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

    // Проверка, заблокирован ли выбор типа аттестации
    const isAssessmentTypeDisabled = () => {
        return ["курсовой проект", "практика"].includes(localStatement.assessmentType);
    };

    // Получение разрешенных типов аттестации
    const getAllowedAssessmentTypes = () => {
        const currentType = localStatement.assessmentType;
        
        if (currentType === "курсовой проект" || currentType === "практика") {
            return [currentType.charAt(0).toUpperCase() + currentType.slice(1)];
        }
        
        return ["Зачет", "Экзамен", "Дифференцированный зачет"];
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

    if (statementData.semester < 1 || statementData.semester > maxSemester) {
        errors.semester = `Семестр должен быть числом от 1 до ${maxSemester}`;
    }

    // Modified validation for practice hours
    if (statementData.assessmentType !== "курсовой проект" && statementData.practiceHours <= 0) {
        errors.practiceHours = "Часы практики должны быть больше 0";
    }

    // Modified validation for credit units
    if (statementData.assessmentType !== "курсовой проект" && statementData.creditUnits <= 0) {
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

    // Обработчики удаления и очистки
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

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Редактирование ведомости</h2>
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

                        {/* Group and Semester row */}
                        <div className="flex gap-2">
                            {/* Group dropdown */}
                            <div className="flex-1">
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

                            {/* Semester input */}
                            <div className="w-24">
                                <label className="block text-sm font-medium text-gray-700">Семестр</label>
                                <input
                                    type="number"
                                    value={localStatement.semester || ""}
                                    onChange={(e) => handleChange(e, "semester")}
                                    min="1"
                                    max={maxSemester}
                                    className={`w-full px-2 py-1 border rounded-lg ${
                                        validationErrors.semester ? "border-red-500" : "border-gray-300"
                                    }`}
                                />
                                {validationErrors.semester && (
                                    <p className="text-red-500 text-sm mt-1">{validationErrors.semester}</p>
                                )}
                            </div>
                        </div>

                        {/* Teacher block */}
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
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
                                    disabled={!localStatement.teacherFacultyId}
                                />
                            </div>
                            <div className="w-24">
                                <label className="block text-sm font-medium text-gray-700">Факультет</label>
                                <SearchableSelect
                                    options={facultyOptions}
                                    value={localStatement.teacherFacultyId || defaultFacultyId}
                                    onChange={(value) => handleChange({ target: { value } }, "teacherFacultyId")}
                                    placeholder="Фак."
                                    formatOption={(f) => f.label}
                                    searchBy={(f) => f.fullName.toLowerCase()}
                                    getOptionValue={(f) => f.id}
                                />
                            </div>
                        </div>

                        {/* Class Teacher block - only for certain assessment types */}
                        {["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType) && (
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">Преподаватель занятий</label>
                                    <SearchableSelect
                                        options={classTeachers}
                                        value={localStatement.classTeacherLogin || ""}
                                        onChange={(value) => setLocalStatement({ ...localStatement, classTeacherLogin: value })}
                                        placeholder="Выберите преподавателя занятий"
                                        error={validationErrors.classTeacherLogin}
                                        formatOption={formatTeacherName}
                                        searchBy={(teacher) =>
                                            `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic}`.toLowerCase()
                                        }
                                        disabled={!localStatement.classTeacherFacultyId}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-medium text-gray-700">Факультет</label>
                                    <SearchableSelect
                                        options={facultyOptions}
                                        value={localStatement.classTeacherFacultyId || defaultFacultyId}
                                        onChange={(value) => handleChange({ target: { value } }, "classTeacherFacultyId")}
                                        placeholder="Фак."
                                        formatOption={(f) => f.label}
                                        searchBy={(f) => f.fullName.toLowerCase()}
                                        getOptionValue={(f) => f.id}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Date input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата (необязательно)</label>
                            <input
                                type="date"
                                value={localStatement.date?.split('T')[0] || ""}
                                onChange={(e) => handleChange(e, "date")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.date ? "border-red-500" : "border-gray-300"
                                }`}
                            />
                            {validationErrors.date && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.date}</p>
                            )}
                        </div>

{/* Practice hours and credit units */}
<div className="flex gap-4">
    <div className="flex-1 relative">
        <label className="block text-sm font-medium text-gray-700">
            Часы практики
            {isSearchingStatement && (
                <span className="ml-2 text-xs text-gray-500">(поиск...)</span>
            )}
        </label>
        <input
            type="number"
            value={localStatement.practiceHours ?? ""}
            onChange={(e) => handleChange(e, "practiceHours")}
            min={localStatement.assessmentType === "курсовой проект" ? "0" : "1"}
            className={`w-full px-2 py-1 border rounded-lg ${
                validationErrors.practiceHours ? "border-red-500" : "border-gray-300"
            }`}
        />
        {validationErrors.practiceHours && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.practiceHours}</p>
        )}
    </div>

    <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">Зачетные единицы</label>
        <input
            type="number"
            value={localStatement.creditUnits ?? ""}
            onChange={(e) => handleChange(e, "creditUnits")}
            min={localStatement.assessmentType === "курсовой проект" ? "0" : "1"}
            className={`w-full px-2 py-1 border rounded-lg ${
                validationErrors.creditUnits ? "border-red-500" : "border-gray-300"
            }`}
        />
        {validationErrors.creditUnits && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.creditUnits}</p>
        )}
    </div>
</div>
                    </div>

                    <div className="flex justify-between mt-6">
                        <div>
                            <button
                                className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleSave()}
                                disabled={updateStatementMutation.isPending}
                                title="Сохранить изменения"
                            >
                                {updateStatementMutation.isPending ? (
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
                        </div>

                        <div className="flex space-x-4">
                            {localStatement.list && (
                                <button
                                    className="h-[40px] w-[40px] p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition flex items-center justify-center"
                                    onClick={handleClearList}
                                    disabled={updateStatementMutation.isPending}
                                    title="Очистить ведомость"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                         viewBox="0 -1.43 122.88 122.88"
                                         className="h-5 w-5 fill-white"
                                         fill="currentColor"
                                    >
                                        <path fillRule="evenodd" clipRule="evenodd" d="M110.97,1.27L70.02,42.73l10.67,10.36l41.25-41.56C125.58,3.7,117.92-2.85,110.97,1.27L110.97,1.27z M54.04,46.81c0.4-0.31,0.81-0.58,1.22-0.81l0.15-0.08c2.35-1.28,4.81-1.24,7.39,0.53l7.17,6.98l0.11,0.11l6.6,6.42 c2.73,2.78,3.34,5.88,1.83,9.31l-19.35,50.75C24.02,112.99-0.34,87.94,0,49.73C19.23,55.35,37.75,57.19,54.04,46.81L54.04,46.81z"/>
                                    </svg>
                                </button>
                            )}

                            <button
                                className="h-[40px] w-[40px] p-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition flex items-center justify-center"
                                onClick={() => setIsConfirmOpen(true)}
                                disabled={deleteStatementMutation.isPending}
                                title="Удалить ведомость"
                            >
                                {deleteStatementMutation.isPending ? (
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