"use client";
import { useState, useEffect } from "react";
import { fetchPossibleStatuses, fetchPossibleRoles, updateUser, deleteUser, hasTeacherStatements } from "../utils/api";
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';

const EditUserModal = ({ user, onClose }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localUser, setLocalUser] = useState(user || {});
    const [roles, setRoles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [localIsBlocked, setLocalIsBlocked] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    useEffect(() => {
        if (user) {
            setLocalUser(user);
            // Определяем статус блокировки на основе поля status или isBlocked
            const isBlocked = user.status === "Заблокированный" || user.isBlocked;
            setLocalIsBlocked(isBlocked);
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesData, statusesData] = await Promise.all([
                    fetchPossibleRoles(),
                    fetchPossibleStatuses()
                ]);
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
        setLocalUser(prev => ({
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

    const handleBlockToggle = () => {
        setLocalIsBlocked(prev => !prev);
    };

    const handleSave = async () => {
        const requiredFields = ["login", "lastName", "firstName", "email", "role"];
        const errors = {};

        requiredFields.forEach(field => {
            if (!localUser[field]) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        try {
            const updatedUser = {
                ...localUser,
                status: localIsBlocked ? "Заблокированный" : "Активный",
                isBlocked: localIsBlocked
            };
            
            await updateUser(localUser.login, updatedUser);
            setValidationErrors({});
            onClose(true); // Передаем true для индикации успешного обновления
        } catch (error) {
            console.error("Ошибка при сохранении пользователя:", error);
            setWarningText("Ошибка при обновлении пользователя. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    };

    const handleDelete = async () => {
        try {
            const { hasStatements } = await hasTeacherStatements(localUser.login);
            if (hasStatements) {
                setIsConfirmOpen(false);
                setWarningText("Удаление невозможно, так как существует зависимость от других данных.");
                setIsWarningOpen(true);
                return;
            }

            const result = await deleteUser(localUser.login);
            if (result.success) {
                setWarningText("Пользователь успешно удалён.");
                setIsWarningOpen(true);
                onClose(true); // Передаем true для индикации успешного удаления
            } else {
                setWarningText(result.error || "Произошла ошибка при удалении пользователя.");
                setIsWarningOpen(true);
            }
        } catch (error) {
            console.error("Ошибка при удалении пользователя:", error);
            setWarningText("Произошла ошибка при удалении пользователя.");
            setIsWarningOpen(true);
        }
    };

    if (!user) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                    <h2 className="text-xl font-semibold mb-4">Редактирование пользователя</h2>
                    
                    <div className="space-y-4">
                        {/* Логин */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Логин</label>
                            <input
                                type="text"
                                value={localUser.login || ""}
                                className="w-full px-2 py-1 border rounded-lg"
                                disabled
                            />
                        </div>

                        {/* Фамилия */}
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

                        {/* Имя */}
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

                        {/* Отчество */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Отчество</label>
                            <input
                                type="text"
                                value={localUser.patronymic || ""}
                                onChange={(e) => handleChange(e, "patronymic")}
                                className="w-full px-2 py-1 border rounded-lg"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={localUser.email || ""}
                                onChange={(e) => handleChange(e, "email")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.email ? "border-red-500" : ""
                                }`}
                            />
                            {validationErrors.email && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                            )}
                        </div>

                        {/* Роль */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Роль</label>
                            <select
                                value={localUser.role || ""}
                                onChange={(e) => handleChange(e, "role")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.role ? "border-red-500" : ""
                                }`}
                            >
                                <option value="">Выберите роль</option>
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            {validationErrors.role && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.role}</p>
                            )}
                        </div>

                        {/* Новый пароль */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Новый пароль</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Введите новый пароль"
                                    onChange={(e) => handleChange(e, "newPassword")}
                                    className="w-full px-2 py-1 border rounded-lg pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                >
                                    {showPassword ? "👁" : "👁‍🗨"}
                                </button>
                            </div>
                        </div>

                        {/* Статус пользователя */}
                        <div className="flex items-center justify-between mt-4 bg-gray-100 p-2 rounded-lg">
                            <span className="text-gray-700 font-medium">
                                {localIsBlocked ? "Заблокирован" : "Активен"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!localIsBlocked}
                                    onChange={handleBlockToggle}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-[26px] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                            onClick={onClose}
                        >
                            Отменить
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            Удалить
                        </button>
                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleSave}
                        >
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                confirmText="Вы действительно хотите удалить пользователя? Это действие необратимо!"
            />
            
            <WarningModal
                isOpen={isWarningOpen}
                onClose={() => setIsWarningOpen(false)}
                warningText={warningText}
            />
        </>
    );
};

export default EditUserModal;