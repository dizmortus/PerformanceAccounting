"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchPossibleStatuses, fetchPossibleRoles, updateUser, deleteUser, hasTeacherStatements } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const EditUserModal = ({ user, onClose, currentUserLogin }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localUser, setLocalUser] = useState({
        login: "",
        lastName: "",
        firstName: "",
        patronymic: "",
        email: "",
        role: "",
        status: "",
        isBlocked: false
    });
    
    const [localIsBlocked, setLocalIsBlocked] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [warningText, setWarningText] = useState("");

    const isCurrentUser = currentUserLogin && user?.login === currentUserLogin;

    const { data: roles = [] } = useQuery({
        queryKey: ['userRoles'],
        queryFn: fetchPossibleRoles,
        staleTime: 60 * 1000
    });

    const { data: statuses = [] } = useQuery({
        queryKey: ['userStatuses'],
        queryFn: fetchPossibleStatuses,
        staleTime: 60 * 1000
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ oldLogin, userData }) => 
            updateUser(oldLogin, userData),
        onSuccess: () => {
            setValidationErrors({});
            onClose(true);
        },
        onError: (error) => {
            console.error("Ошибка при сохранении пользователя:", error);
            setWarningText(error.message || "Ошибка при обновлении пользователя. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });
    
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
            oldLogin: user.login, // Явно передаем старый логин в теле запроса
            ...localUser,         // Все остальные данные, включая новый логин
            status: localIsBlocked ? "Заблокированный" : "Активный",
            isBlocked: localIsBlocked
        };
        
        updateUserMutation.mutate({ 
            oldLogin: user.login, // Старый логин как ID в URL
            userData: updatedUser // Все данные в теле запроса
        });
    };

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
        if (isCurrentUser) {
            setWarningText("Вы не можете заблокировать себя!");
            setIsWarningOpen(true);
            return;
        }
        setLocalIsBlocked(prev => !prev);
    };


    const handleDelete = async () => {
        checkStatementsMutation.mutate(localUser.login);
    };

    if (!user) return null;

   
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Редактирование пользователя</h2>
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
                        {/* Поле для логина */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Логин</label>
                            <input
                                type="text"
                                value={localUser.login || ""}
                                onChange={(e) => handleChange(e, "login")}
                                className={`w-full px-2 py-1 border rounded-lg ${
                                    validationErrors.login ? "border-red-500" : ""
                                }`}
                                placeholder="Введите логин"
                            />
                            {validationErrors.login && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.login}</p>
                            )}
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
                                    disabled={isCurrentUser}
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
                    <div className="flex justify-between mt-6">
                        {/* Кнопка сохранения */}
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleSave}
                            disabled={updateUserMutation.isPending}
                            title="Сохранить изменения"
                        >
                            {updateUserMutation.isPending ? (
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
    
                        {/* Кнопка удаления */}
                        <button
                            className="h-[40px] w-[40px] p-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition flex items-center justify-center"
                            onClick={() => setIsConfirmOpen(true)}
                            disabled={deleteUserMutation.isPending}
                            title="Удалить пользователя"
                        >
                            {deleteUserMutation.isPending ? (
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