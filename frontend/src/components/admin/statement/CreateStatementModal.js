'use client';
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
    createStatement, 
    fetchAllTeachers, 
    fetchAllDisciplines, 
    fetchAllGroups,
    fetchAllFaculties,
    fetchStatementByGroupDisciplineSemester,
    importEntitiesFromExcel
} from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const CreateStatementModal = ({ onClose, currentUser }) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
    const [fileKey, setFileKey] = useState(Date.now());

    // Получаем данные о факультетах
    const { data: facultiesResponse = { faculties: [], currentUserFaculty: null } } = useQuery({
        queryKey: ['faculties'],
        queryFn: fetchAllFaculties,
        staleTime: 60 * 1000,
    });

    const facultyOptions = facultiesResponse.faculties?.map(f => ({
        id: f.id,
        label: f.abbreviation,
        fullName: f.name,
        ...f
    })) || [];

    const defaultFacultyId = facultiesResponse.currentUserFaculty?.id || currentUser?.facultyId;

    const [localStatement, setLocalStatement] = useState({
        teacherLogin: "",
        teacherFacultyId: defaultFacultyId || null,
        classTeacherLogin: "",
        classTeacherFacultyId: defaultFacultyId || null,
        groupId: "",
        semester: "",
        disciplineId: "",
        practiceHours: "",
        creditUnits: "2",
        date: "",
        assessmentType: "зачет"
    });

    const assessmentTypeOptions = [
        "Зачет",
        "Экзамен",
        "Практика",
        "Курсовой проект",
        "Дифференцированный зачет"
    ];

    // Mutation for importing statements from Excel
    const importStatementsMutation = useMutation({
        mutationFn: (file) => importEntitiesFromExcel('statement', file),
        onSuccess: (data) => {
            if (data.errorCount > 0) {
                setWarningText(`Импорт завершен с ошибками. Успешно: ${data.importedCount}, Ошибок: ${data.errorCount}`);
            } else {
                setWarningText(`Успешно импортировано ${data.importedCount} ведомостей`);
            }
            setIsWarningOpen(true);
            if (data.errorCount === 0) onClose();
        },
        onError: (error) => {
            console.error("Ошибка при импорте ведомостей:", error);
            setWarningText(error.message || "Ошибка при импорте ведомостей. Проверьте формат файла.");
            setIsWarningOpen(true);
        }
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await importStatementsMutation.mutateAsync(file);
            setFileKey(Date.now());
        } catch (error) {
            console.error("Import error:", error);
            setFileKey(Date.now());
        }
    };

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

    useEffect(() => {
        if (defaultFacultyId && !localStatement.teacherFacultyId) {
            setLocalStatement(prev => ({
                ...prev,
                teacherFacultyId: defaultFacultyId,
                classTeacherFacultyId: defaultFacultyId
            }));
        }
    }, [defaultFacultyId, localStatement.teacherFacultyId]);

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

    // Получаем текущую группу для установки семестра по умолчанию
    const currentGroup = groups.find(g => g.id === localStatement.groupId);
    const maxSemester = currentGroup ? currentGroup.coursesCount * 2 : 10;

    useEffect(() => {
        if (currentGroup) {
            setLocalStatement(prev => ({
                ...prev,
                semester: currentGroup.currentSemester || ""
            }));
        }
    }, [localStatement.groupId, currentGroup]);

    const filteredDisciplines = localStatement.assessmentType === "практика" 
        ? disciplinesData.filter(d => d.isPractice)
        : disciplinesData.filter(d => !d.isPractice);

    const createStatementMutation = useMutation({
        mutationFn: createStatement,
        onSuccess: () => {
            setWarningText("Ведомость успешно создана!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при создании ведомости:", error);
            setWarningText("Ошибка при создании ведомости. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const formatTeacherName = (teacher) => {
        const lastName = teacher.lastName || '';
        const firstName = teacher.firstName || '';
        const patronymic = teacher.patronymic || '';
        return `${lastName} ${firstName} ${patronymic}`.trim();
    };

    const handleChange = (e, field) => {
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

    const handleCreate = async () => {
        const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "creditUnits"];
        const errors = {};
    
        requiredFields.forEach((field) => {
            if (!localStatement[field] && localStatement[field] !== 0) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });
    
        if (["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType)) {
            if (!localStatement.classTeacherLogin) {
                errors.classTeacherLogin = "Преподаватель занятий обязателен для выбранного типа аттестации";
            }
        }
    
        if (localStatement.semester < 1 || localStatement.semester > maxSemester) {
            errors.semester = `Семестр должен быть числом от 1 до ${maxSemester}`;
        }
    
        if (localStatement.practiceHours <= 0) {
            errors.practiceHours = "Часы практики должны быть больше 0";
        }
    
        if (localStatement.creditUnits <= 0) {
            errors.creditUnits = "Зачетные единицы должны быть больше 0";
        }
    
        if (localStatement.date && isNaN(new Date(localStatement.date).getTime())) {
            errors.date = "Некорректная дата";
        }
    
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
    
        const statementToCreate = {
            ...localStatement,
            date: localStatement.date ? new Date(localStatement.date).toISOString() : null,
            creditUnits: parseInt(localStatement.creditUnits),
            classTeacherLogin: ["экзамен", "зачет", "дифференцированный зачет"].includes(localStatement.assessmentType)
                ? localStatement.classTeacherLogin
                : null
        };
    
        createStatementMutation.mutate(statementToCreate);
    };

    useEffect(() => {
        const fetchAndSetStatementData = async () => {
            if (
                localStatement.assessmentType === "курсовой проект" &&
                localStatement.groupId &&
                localStatement.disciplineId &&
                localStatement.semester
            ) {
                try {
                    const existingStatement = await fetchStatementByGroupDisciplineSemester(
                        localStatement.groupId,
                        localStatement.disciplineId,
                        localStatement.semester
                    );

                    setLocalStatement(prev => ({
                        ...prev,
                        practiceHours: existingStatement?.practiceHours || "0",
                        creditUnits: existingStatement?.creditUnits || "0"
                    }));
                } catch (error) {
                    console.error("Ошибка при поиске ведомости:", error);
                    setLocalStatement(prev => ({
                        ...prev,
                        practiceHours: "0",
                        creditUnits: "0"
                    }));
                }
            }
        };

        fetchAndSetStatementData();
    }, [localStatement.assessmentType, localStatement.groupId, localStatement.disciplineId, localStatement.semester]);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Создание новой ведомости</h2>
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
                                options={assessmentTypeOptions}
                                value={localStatement.assessmentType.charAt(0).toUpperCase() + localStatement.assessmentType.slice(1)}
                                onChange={(value) => handleChange({ target: { value: value.toLowerCase() } }, "assessmentType")}
                                placeholder="Выберите тип аттестации"
                                error={validationErrors.assessmentType}
                                formatOption={(option) => option}
                                searchBy={(option) => option.toLowerCase()}
                            />
                        </div>

                        {/* Discipline dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {localStatement.assessmentType === "практика" ? "Практика" : "Дисциплина"}
                            </label>
                            <SearchableSelect
                                options={filteredDisciplines}
                                value={localStatement.disciplineId}
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
                                    value={localStatement.teacherLogin}
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

                        {/* Class teacher block (for certain assessment types) */}
                        {["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType) && (
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700">Преподаватель занятий</label>
                                    <SearchableSelect
                                        options={classTeachers}
                                        value={localStatement.classTeacherLogin}
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
                                value={localStatement.date || ""}
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
                            {/* Practice hours input */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Часы практики</label>
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

                    {/* Action buttons */}
                    <div className="flex justify-between mt-6">
                        {/* Import button */}
                        <div className="relative">
                             {/* Save button */}
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleCreate}
                            disabled={createStatementMutation.isPending}
                        >
                            {createStatementMutation.isPending ? (
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
                                    ${importStatementsMutation.isPending 
                                        ? 'bg-gray-300 cursor-wait' 
                                        : 'bg-[#217346] hover:bg-[#1a5f38] text-white border border-[#1a5f38]'}
                                    `}
                                disabled={importStatementsMutation.isPending}
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
                                
                                {importStatementsMutation.isPending ? (
                                    <span className="text-base">Импорт...</span>
                                ) : (
                                    <span className="text-base">Импорт</span>
                                )}
                            </label>
                       
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleCreate}
                confirmText="Вы действительно хотите создать новую ведомость?"
            />
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default CreateStatementModal;