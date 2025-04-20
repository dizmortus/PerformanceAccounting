"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchPossibleStatuses, fetchPossibleRoles, updateUser, deleteUser, hasTeacherStatements } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const EditUserModal = ({ user, onClose, currentUserLogin }) => { // Добавлен currentUserLogin
    const [showPassword, setShowPassword] = useState(false);
    const [localUser, setLocalUser] = useState(user || {});
    const [localIsBlocked, setLocalIsBlocked] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    // Проверка, является ли редактируемый пользователь текущим пользователем
    const isCurrentUser = currentUserLogin && user?.login === currentUserLogin;

    // Fetch data with React Query
    const { data: roles = [] } = useQuery({
        queryKey: ['userRoles'],
        queryFn: fetchPossibleRoles,
        staleTime: 60 * 1000 // 1 minute
    });

    const { data: statuses = [] } = useQuery({
        queryKey: ['userStatuses'],
        queryFn: fetchPossibleStatuses,
        staleTime: 60 * 1000
    });

    // Mutations for update and delete
    const updateUserMutation = useMutation({
        mutationFn: ({ login, userData }) => updateUser(login, userData),
        onSuccess: () => {
            setValidationErrors({});
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при сохранении пользователя:", error);
            setWarningText("Ошибка при обновлении пользователя. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    const checkStatementsMutation = useMutation({
        mutationFn: hasTeacherStatements,
        onSuccess: ({ hasStatements }) => {
            if (hasStatements) {
                setIsConfirmOpen(false);
                setWarningText("Удаление невозможно, так как существует зависимость от других данных.");
                setIsWarningOpen(true);
            } else {
                deleteUserMutation.mutate(localUser.login);
            }
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: (result) => {
            if (result?.success) {
                setWarningText("Пользователь успешно удалён.");
                setIsWarningOpen(true);
                onClose(true);
            } else {
                setWarningText(result?.error || "Произошла ошибка при удалении пользователя.");
                setIsWarningOpen(true);
            }
        },
        onError: (error) => {
            console.error("Ошибка при удалении пользователя:", error);
            setWarningText("Произошла ошибка при удалении пользователя.");
            setIsWarningOpen(true);
        }
    });

    useEffect(() => {
        if (user) {
            setLocalUser(user);
            const isBlocked = user.status === "Заблокированный" || user.isBlocked;
            setLocalIsBlocked(isBlocked);
        }
    }, [user]);

    const handleBlockToggle = () => {
        if (isCurrentUser) {
            setWarningText("Вы не можете заблокировать себя!");
            setIsWarningOpen(true);
            return;
        }
        setLocalIsBlocked(prev => !prev);
    };

    const handleSave = async () => {
        if (isCurrentUser && localIsBlocked) {
            setWarningText("Вы не можете заблокировать себя!");
            setIsWarningOpen(true);
            return;
        }

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

        const updatedUser = {
            ...localUser,
            status: localIsBlocked ? "Заблокированный" : "Активный",
            isBlocked: localIsBlocked
        };
        
        updateUserMutation.mutate({ login: localUser.login, userData: updatedUser });
    };

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

    const handleDelete = async () => {
        checkStatementsMutation.mutate(localUser.login);
    };

    if (!user) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Редактирование пользователя</h2>
                    
                    <div className="space-y-4">
                        {/* Login (disabled) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Логин</label>
                            <input
                                type="text"
                                value={localUser.login || ""}
                                className="w-full px-2 py-1 border rounded-lg"
                                disabled
                            />
                        </div>

                        {/* Last Name */}
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

                        {/* First Name */}
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

                        {/* Patronymic */}
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

            
{/* Role */}
<div>
    <label className="block text-sm font-medium text-gray-700">Роль</label>
    <SearchableSelect
        options={roles}
        value={localUser.role || ""}
        onChange={(newValue) => handleChange({ target: { value: newValue } }, "role")}
        placeholder="Выберите роль"
        error={validationErrors.role}
        formatOption={(option) => option}
        searchBy={(option) => option.toLowerCase()}
    />
    {validationErrors.role && (
        <p className="text-red-500 text-sm mt-1">{validationErrors.role}</p>
    )}
</div>



                        {/* New Password */}
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
                                disabled={isCurrentUser} // Делаем переключатель неактивным для текущего пользователя
                            />
                            <div className={`w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-[26px] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-500 ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                        </label>
                        {isCurrentUser && (
                            <span className="text-sm text-gray-500 ml-2">
                                (Вы не можете заблокировать себя)
                            </span>
                        )}
                    </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 mt-6">
                    <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleSave}
                            disabled={updateUserMutation.isPending}
                        >
                            {updateUserMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending ? "Удаление..." : "Удалить"}
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