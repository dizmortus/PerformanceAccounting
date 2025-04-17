import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
    createStatement, 
    fetchAllTeachers, 
    fetchAllDisciplines, 
    fetchAllGroups,
    getExactSemester,
    getCurrentSemesterNumber
} from "../../utils/api";
import ConfirmModal from '../ConfirmModal';
import WarningModal from '../WarningModal';
import SearchableSelect from './SearchableSelect';

const CreateStatementModal = ({ onClose }) => {
    const [localStatement, setLocalStatement] = useState({
        teacherLogin: "",
        groupId: "",
        semester: "",
        disciplineId: "",
        practiceHours: 0,
        creditUnits: 2,
        date: "",
        assessmentType: "зачет",
        classTeacherLogin: ""
    });
    
    const [isFieldsLocked, setIsFieldsLocked] = useState(false);
    const [currentSemesterId, setCurrentSemesterId] = useState(null);
    const [semesterData, setSemesterData] = useState(null); // Добавлено состояние для данных семестра
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    // Эффект для установки текущего семестра
    useEffect(() => {
        const setDefaultSemester = async () => {
            if (localStatement.groupId) {
                try {
                    const currentSemester = await getCurrentSemesterNumber(localStatement.groupId);
                    setLocalStatement(prev => ({
                        ...prev,
                        semester: currentSemester.toString()
                    }));
                } catch (error) {
                    console.error("Ошибка при получении текущего семестра:", error);
                }
            }
        };
        setDefaultSemester();
    }, [localStatement.groupId]);

    // Эффект для проверки существующего семестра
    useEffect(() => {
        const checkSemester = async () => {
            if (!localStatement.groupId || !localStatement.disciplineId || !localStatement.semester) {
                setIsFieldsLocked(false);
                setCurrentSemesterId(null);
                setSemesterData(null); // Сбрасываем данные семестра
                return;
            }
    
            try {
                const data = await getExactSemester(
                    localStatement.groupId,
                    localStatement.disciplineId,
                    localStatement.semester
                );
    
                if (data) {
                    setSemesterData(data); // Сохраняем данные семестра
                    setLocalStatement(prev => ({
                        ...prev,
                        practiceHours: data.hours || 0,
                        creditUnits: data.creditUnits || 2
                    }));
                    setIsFieldsLocked(true);
                    setCurrentSemesterId(data.id);
                } else {
                    setSemesterData(null); // Сбрасываем данные семестра
                    setIsFieldsLocked(false);
                    setCurrentSemesterId(null);
                }
            } catch (error) {
                console.error("Ошибка при проверке семестра:", error);
                setSemesterData(null); // Сбрасываем данные семестра
                setIsFieldsLocked(false);
                setCurrentSemesterId(null);
            }
        };
        
        checkSemester();
    }, [localStatement.groupId, localStatement.disciplineId, localStatement.semester]);


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
        const newState = {
            ...localStatement,
            [field]: field === "practiceHours" || field === "creditUnits" ? Number(value) : value,
        };
    
        // Сбрасываем данные семестра при изменении ключевых полей
        if (['groupId', 'disciplineId', 'semester'].includes(field)) {
            setSemesterData(null);
            setIsFieldsLocked(false);
            setCurrentSemesterId(null);
            
            if (field === "groupId" && !value) {
                // Если группа была очищена
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
            if (!["зачет", "экзамен", "дифференцированный зачет"].includes(value)) {
                newState.classTeacherLogin = "";
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

    const isExamType = ["зачет", "экзамен", "дифференцированный зачет"].includes(localStatement.assessmentType);
    const showClassTeacher = isExamType && !currentSemesterId;

    // Фильтрация типов аттестации при найденном семестре
    const assessmentTypeOptions = [
        { value: "практика", label: "Практика" },
        { value: "курсовой проект", label: "Курсовой проект" },
        ...(!currentSemesterId ? [
            { value: "зачет", label: "Зачет" },
            { value: "экзамен", label: "Экзамен" },
            { value: "дифференцированный зачет", label: "Дифференцированный зачет" }
        ] : [])
    ];

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
        const firstNameInitial = teacher.firstName ? teacher.firstName[0] : '';
        const patronymicInitial = teacher.patronymic ? teacher.patronymic[0] : '';
        return `${lastName} ${firstNameInitial}.${patronymicInitial}.`;
    };

    const handleCreate = async () => {
        const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "creditUnits"];
        if (showClassTeacher) requiredFields.push("classTeacherLogin");
        
        const errors = {};
        requiredFields.forEach((field) => {
            if (!localStatement[field] && localStatement[field] !== 0) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        const statementToCreate = {
            ...localStatement,
            date: localStatement.date ? new Date(localStatement.date).toISOString() : null,
            semesterId: currentSemesterId
        };
        
        createStatementMutation.mutate(statementToCreate);
    };
// В начале компонента добавим вспомогательные функции
const formatGroupOption = (group) => group.id;
const formatDisciplineOption = (discipline) => discipline.name;
const formatTeacherOption = (teacher) => {
    const lastName = teacher.lastName || '';
    const firstNameInitial = teacher.firstName ? teacher.firstName[0] : '';
    const patronymicInitial = teacher.patronymic ? teacher.patronymic[0] : '';
    return `${lastName} ${firstNameInitial}.${patronymicInitial}.`;
};
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Создание новой ведомости</h2>
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
        formatOption={formatGroupOption}
        searchBy={(group) => group.id.toLowerCase()}
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
        onChange={(e) => handleChange(e, "disciplineId")}
        placeholder={localStatement.assessmentType === "практика" 
            ? "Выберите практику" 
            : "Выберите дисциплину"}
        error={validationErrors.disciplineId}
        disabled={!localStatement.assessmentType}
        formatOption={formatDisciplineOption}
        searchBy={(discipline) => discipline.name.toLowerCase()}
    />
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
</div>

{/* Class teacher dropdown */}
{showClassTeacher && (
    <div>
        <label className="block text-sm font-medium text-gray-700">Преподаватель занятий</label>
        <SearchableSelect
            options={teachers}
            value={localStatement.classTeacherLogin}
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
</div>

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

                    {/* Hours and credit units - в одной строке */}
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
                                disabled={isFieldsLocked}
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
                                disabled={isFieldsLocked}
                            />
                            {validationErrors.creditUnits && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.creditUnits}</p>
                            )}
                        </div>
                    </div>

                    {isFieldsLocked && (
                        <p className="text-gray-500 text-sm">Значения установлены автоматически на основе учебного плана</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleCreate}
                            disabled={createStatementMutation.isPending}
                        >
                            {createStatementMutation.isPending ? "Создание..." : "Создать"}
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
                onConfirm={handleCreate}
                confirmText="Вы действительно хотите создать новую ведомость?"
            />
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </div>
    );
};

export default CreateStatementModal;