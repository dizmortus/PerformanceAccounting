"use client";
import { useState, useEffect } from "react";
import { fetchPossibleStatuses, fetchPossibleRoles, createUser, checkUserByLogin } from "../utils/api";
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';

const CreateUserModal = ({ onClose }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localUser, setLocalUser] = useState({
        login: "",
        lastName: "",
        firstName: "",
        patronymic: "",
        email: "",
        role: "Преподаватель", // Установлено значение по умолчанию
        newPassword: "",
        isBlocked: false,
    });
    const [roles, setRoles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Состояние для ConfirmModal
    const [isWarningOpen, setIsWarningOpen] = useState(false); // Состояние для WarningModal
    const [warningText, setWarningText] = useState(""); // Текст для WarningModal
    const [emailError, setEmailError] = useState(""); // Состояние для ошибки email
    const [validationErrors, setValidationErrors] = useState({}); // Состояние для ошибок валидации

    useEffect(() => {
        const fetchData = async () => {
            try {
                const rolesData = await fetchPossibleRoles();
                const statusesData = await fetchPossibleStatuses();
                setRoles(rolesData);
                setStatuses(statusesData);
            } catch (error) {
                console.error("Ошибка загрузки данных:", error);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e, field) => {
        const value = e.target.value;
        setLocalUser((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Очистка ошибки валидации при изменении поля
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }

        // Валидация email при изменении
        if (field === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                setEmailError("Введите корректный email");
            } else {
                setEmailError("");
            }
        }
    };

    const handleBlockToggle = () => {
        setLocalUser((prev) => ({
            ...prev,
            isBlocked: !prev.isBlocked,
        }));
    };

    const handleCreate = async () => {
        // Проверка, что все обязательные поля заполнены
        const requiredFields = ["login", "lastName", "firstName", "email", "newPassword"]; // Убрано поле role
        const errors = {};

        requiredFields.forEach((field) => {
            if (!localUser[field]) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Проверка email перед отправкой
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(localUser.email)) {
            setEmailError("Введите корректный email");
            return; // Остановка выполнения, если email некорректен
        }

        // Проверка, существует ли пользователь с таким логином
        const { exists } = await checkUserByLogin(localUser.login);
        if (exists) {
            setWarningText("Пользователь с таким логином уже существует!");
            setIsWarningOpen(true);
            return;
        }

        try {
            const newUser = {
                ...localUser,
                password: localUser.newPassword, // Переименовываем newPassword в password
                status: localUser.isBlocked ? "Заблокированный" : "Активный",
            };

            console.log("Данные для создания пользователя:", newUser); // Логируем данные перед отправкой

            await createUser(newUser);
            setWarningText("Пользователь успешно создан!");
            setIsWarningOpen(true);
            onClose();
        } catch (error) {
            console.error("Ошибка при создании пользователя:", error);
            setWarningText("Ошибка при создании пользователя. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                    <h2 className="text-xl font-semibold mb-4">Создание нового пользователя</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Логин</label>
                            <input
                                type="text"
                                value={localUser.login || ""}
                                onChange={(e) => handleChange(e, "login")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.login ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.login && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.login}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Фамилия</label>
                            <input
                                type="text"
                                value={localUser.lastName || ""}
                                onChange={(e) => handleChange(e, "lastName")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.lastName ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.lastName && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Имя</label>
                            <input
                                type="text"
                                value={localUser.firstName || ""}
                                onChange={(e) => handleChange(e, "firstName")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.firstName ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.firstName && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Отчество</label>
                            <input
                                type="text"
                                value={localUser.patronymic || ""}
                                onChange={(e) => handleChange(e, "patronymic")}
                                className="w-full px-2 py-1 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={localUser.email || ""}
                                onChange={(e) => handleChange(e, "email")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.email || emailError ? "border-red-500" : ""
                                }`}
                            />
                            {(validationErrors.email || emailError) && (
                                <p className="text-red-500 text-sm mt-1">
                                    {validationErrors.email || emailError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Роль</label>
                            <select
                                value={localUser.role || ""}
                                onChange={(e) => handleChange(e, "role")}
                                className="w-full px-2 py-1 border rounded-lg"
                            >
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Поле "Пароль" */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Пароль</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Введите пароль"
                                    onChange={(e) => handleChange(e, "newPassword")}
                                    className={`w-full px-2 py-1 border rounded-lg pr-10 ${
                                        validationErrors.newPassword ? "border-red-500" : ""
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                >
                                    {showPassword ? "👁" : "👁‍🗨"}
                                </button>
                            </div>
                            {validationErrors.newPassword && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.newPassword}</p>
                            )}
                        </div>

                        {/* Переключатель блокировки */}
                        <div className="flex items-center justify-between mt-4 bg-gray-100 p-2 rounded-lg">
                            <span className="text-gray-700 font-medium">
                                {localUser.isBlocked ? "Заблокирован" : "Активен"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!localUser.isBlocked}
                                    onChange={handleBlockToggle}
                                    className="sr-only peer"
                                />
                                <div
                                    className={`w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 
                                        rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-[26px]
                                        after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white 
                                        after:border after:rounded-full after:h-6 after:w-6 after:transition-all 
                                        peer-checked:bg-teal-500`}
                                ></div>
                            </label>
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
                confirmText="Вы действительно хотите создать нового пользователя?"
            />
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default CreateUserModal;