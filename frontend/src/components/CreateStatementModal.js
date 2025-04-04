'use client';
import { useState, useEffect } from "react";
import { createStatement, fetchAllTeachers, fetchAllDisciplines, fetchAllGroups } from "../utils/api";
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';

const CreateStatementModal = ({ onClose }) => {
    const [localStatement, setLocalStatement] = useState({
        teacherLogin: "",
        disciplineId: "",
        groupId: "",
        practiceHours: "",
        semester: "",
        assessmentType: "зачет",
        date: "" // Поле даты не обязательно
    });
    const [teachers, setTeachers] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    const formatTeacherName = (teacher) => {
        const lastName = teacher.lastName || '';
        const firstNameInitial = teacher.firstName ? teacher.firstName[0] : '';
        const patronymicInitial = teacher.patronymic ? teacher.patronymic[0] : '';
        return `${lastName} ${firstNameInitial}.${patronymicInitial}.`;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [teachersData, disciplinesData, groupsData] = await Promise.all([
                    fetchAllTeachers(),
                    fetchAllDisciplines(),
                    fetchAllGroups(),
                ]);
                setTeachers(teachersData);
                setDisciplines(disciplinesData);
                setGroups(groupsData);
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
                setWarningText("Ошибка при загрузке данных. Попробуйте снова.");
                setIsWarningOpen(true);
            }
        };

        loadData();
    }, []);

    const handleChange = (e, field) => {
        const value = e.target.value;
        setLocalStatement((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (validationErrors[field]) {
            setValidationErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    const handleCreate = async () => {
        const requiredFields = ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType"];
        const errors = {};

        requiredFields.forEach((field) => {
            if (!localStatement[field]) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (localStatement.semester < 1 || localStatement.semester > 10) {
            errors.semester = "Семестр должен быть числом от 1 до 10";
        }

        // Валидация даты (только если она указана)
        if (localStatement.date && isNaN(new Date(localStatement.date).getTime())) {
            errors.date = "Некорректная дата";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        try {
            // Форматируем данные перед отправкой (дата может быть null)
            const statementToCreate = {
                ...localStatement,
                date: localStatement.date ? new Date(localStatement.date).toISOString() : null
            };
            
            await createStatement(statementToCreate);
            setWarningText("Ведомость успешно создана!");
            setIsWarningOpen(true);
            onClose();
        } catch (error) {
            console.error("Ошибка при создании ведомости:", error);
            setWarningText("Ошибка при создании ведомости. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                    <h2 className="text-xl font-semibold mb-4">Создание новой ведомости</h2>
                    <div className="space-y-4">
                        {/* Выпадающее меню для преподавателя */}
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
    
                        {/* Выпадающее меню для дисциплины */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дисциплина</label>
                            <select
                                value={localStatement.disciplineId || ""}
                                onChange={(e) => handleChange(e, "disciplineId")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.disciplineId ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">Выберите дисциплину</option>
                                {disciplines.map((discipline) => (
                                    <option key={discipline.id} value={discipline.id}>
                                        {discipline.name}
                                    </option>
                                ))}
                            </select>
                            {validationErrors.disciplineId && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.disciplineId}</p>
                            )}
                        </div>
    
                        {/* Выпадающее меню для группы */}
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
    
                        {/* Поле для ввода даты */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Дата (необязательно)
                            </label>
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
    
                        {/* Поле для часов практики с валидацией */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Часы практики</label>
                            <input
                                type="number"
                                value={localStatement.practiceHours || ""}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value <= 0) {
                                        setValidationErrors({
                                            ...validationErrors,
                                            practiceHours: "Часы практики должны быть больше 0"
                                        });
                                    } else {
                                        const newErrors = {...validationErrors};
                                        delete newErrors.practiceHours;
                                        setValidationErrors(newErrors);
                                        handleChange(e, "practiceHours");
                                    }
                                }}
                                min="1"
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.practiceHours ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.practiceHours && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.practiceHours}</p>
                            )}
                        </div>
    
                        {/* Остальные поля */}
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Тип аттестации</label>
                            <select
                                value={localStatement.assessmentType || ""}
                                onChange={(e) => handleChange(e, "assessmentType")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.assessmentType ? "border-red-500" : ""
                                }`}
                            >
                                <option value="зачет">Зачет</option>
                                <option value="экзамен">Экзамен</option>
                            </select>
                            {validationErrors.assessmentType && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.assessmentType}</p>
                            )}
                        </div>
                    </div>
    
                    {/* Основные кнопки */}
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                            onClick={onClose}
                        >
                            Отменить
                        </button>
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleCreate}
                        >
                            Создать
                        </button>
                    </div>
                </div>
            </div>
    
            {/* Модальные окна */}
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