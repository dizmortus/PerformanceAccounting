"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchPossibleStatuses, fetchPossibleRoles, createUser, checkUserByLogin, importEntitiesFromExcel } from "../../../utils/api";
import ConfirmModal from '../../ConfirmModal';
import WarningModal from '../../WarningModal';
import SearchableSelect from '../SearchableSelect';

const CreateUserModal = ({ onClose }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordMatchError, setPasswordMatchError] = useState("");
    const [localUser, setLocalUser] = useState({
        login: "",
        lastName: "",
        firstName: "",
        patronymic: "",
        email: "",
        role: "Преподаватель",
        newPassword: "",
        isBlocked: false,
        isDean: false
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [emailError, setEmailError] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
    const [localIsDean, setLocalIsDean] = useState(false);
    const [fileKey, setFileKey] = useState(Date.now());

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

    // Mutation for checking user existence
    const checkUserMutation = useMutation({
        mutationFn: checkUserByLogin,
        onSuccess: (data) => {
            if (data.exists) {
                setWarningText("Пользователь с таким логином уже существует!");
                setIsWarningOpen(true);
            } else {
                createUserMutation.mutate({
                    ...localUser,
                    password: localUser.newPassword,
                    status: localUser.isBlocked ? "Заблокированный" : "Активный",
                    isDean: localIsDean
                });
            }
        }
    });

    // Mutation for creating user
    const createUserMutation = useMutation({
        mutationFn: (userData) => createUser({
            ...userData,
            isDean: localIsDean
        }),
        onSuccess: () => {
            setWarningText("Пользователь успешно создан!");
            setIsWarningOpen(true);
            onClose();
        },
        onError: (error) => {
            console.error("Ошибка при создании пользователя:", error);
            setWarningText("Ошибка при создании пользователя. Попробуйте снова.");
            setIsWarningOpen(true);
        }
    });

    // Mutation for importing users from Excel
    const importUsersMutation = useMutation({
        mutationFn: (file) => importEntitiesFromExcel('user', file),
        onSuccess: (data) => {
            if (data.errorCount > 0) {
                setWarningText(`Импорт завершен с ошибками. Успешно: ${data.importedCount}, Ошибок: ${data.errorCount}`);
            } else {
                setWarningText(`Успешно импортировано ${data.importedCount} пользователей`);
            }
            setIsWarningOpen(true);
            if (data.errorCount === 0) onClose();
        },
        onError: (error) => {
            console.error("Ошибка при импорте пользователей:", error);
            setWarningText(error.message || "Ошибка при импорте пользователей. Проверьте формат файла.");
            setIsWarningOpen(true);
        }
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await importUsersMutation.mutateAsync(file);
            setFileKey(Date.now());
        } catch (error) {
            console.error("Import error:", error);
            setFileKey(Date.now());
        }
    };

    const handleRoleChange = (selectedRole) => {
        setLocalUser((prev) => ({
            ...prev,
            role: selectedRole,
        }));
    };

    const handleBlockToggle = () => {
        setLocalUser((prev) => ({
            ...prev,
            isBlocked: !prev.isBlocked,
        }));
    };

    const handleChange = (e, field) => {
        const value = e.target.value;
        const updatedUser = {
            ...localUser,
            [field]: value,
        };
        setLocalUser(updatedUser);
    
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    
        if (field === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                setEmailError("Введите корректный email");
            } else {
                setEmailError("");
            }
        }
    
        if ((field === "newPassword" || field === "confirmPassword")) {
            if (updatedUser.newPassword && updatedUser.confirmPassword) {
                if (updatedUser.newPassword !== updatedUser.confirmPassword) {
                    setPasswordMatchError("Пароли не совпадают");
                } else {
                    setPasswordMatchError("");
                }
            } else {
                setPasswordMatchError("");
            }
        }
    };

    const handleCreate = async () => {
        const requiredFields = ["login", "lastName", "firstName", "email", "newPassword", "confirmPassword"];
        const errors = {};

        requiredFields.forEach((field) => {
            if (!localUser[field]) {
                errors[field] = "Это поле обязательно для заполнения";
            }
        });

        if (localUser.newPassword !== localUser.confirmPassword) {
            errors.confirmPassword = "Пароли не совпадают";
            setPasswordMatchError("Пароли не совпадают");
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(localUser.email)) {
            setEmailError("Введите корректный email");
            return;
        }

        checkUserMutation.mutate(localUser.login);
    };

    const handleDeanToggle = () => {
        setLocalIsDean(prev => !prev);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Создание нового пользователя</h2>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Логин</label>
                            <input
                                type="text"
                                value={localUser.login}
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
                                value={localUser.lastName}
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
                                value={localUser.firstName}
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
                                value={localUser.patronymic}
                                onChange={(e) => handleChange(e, "patronymic")}
                                className="w-full px-2 py-1 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={localUser.email}
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
                            <SearchableSelect
                                options={roles}
                                value={localUser.role}
                                onChange={handleRoleChange}
                                placeholder="Выберите роль"
                                formatOption={(option) => option}
                                searchBy={(option) => option.toLowerCase()}
                            />
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Подтверждение пароля</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Повторите пароль"
                                    onChange={(e) => handleChange(e, "confirmPassword")}
                                    className={`w-full px-2 py-1 border rounded-lg pr-10 ${
                                        validationErrors.confirmPassword ? "border-red-500" : ""
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                >
                                    {showConfirmPassword ? "👁" : "👁‍🗨"}
                                </button>
                            </div>
                            {(validationErrors.confirmPassword || passwordMatchError) && (
                                <p className="text-red-500 text-sm mt-1">
                                    {validationErrors.confirmPassword || passwordMatchError}
                                </p>
                            )}
                        </div>

                        {/* Блок статусов: Активен/Заблокирован и Декан */}
                        <div className="flex items-center justify-between mt-4 space-x-4">
                            <div className="flex-1 bg-gray-100 p-2 rounded-lg">
                                <div className="flex items-center justify-between">
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
                                        <div className={`w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-[26px] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-500`}></div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isDean"
                                    onChange={handleDeanToggle}
                                    className="appearance-none h-8 w-8 bg-white border-2 border-gray-300 rounded-xl checked:bg-teal-500 checked:border-teal-500 transition-all duration-200 cursor-pointer relative
                                               flex items-center justify-center after:content-['✔'] after:text-white after:text-base after:scale-0 checked:after:scale-100 after:transition-transform after:duration-200
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <label htmlFor="isDean" className="ml-3 text-sm font-medium text-gray-700">
                                    Декан
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-6">
                        <button
                            className="h-[40px] px-4 flex items-center gap-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleCreate}
                            disabled={createUserMutation.isPending}
                        >
                            {createUserMutation.isPending ? (
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

                        {/* Кнопка импорта */}
                        <div className="relative">
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
                                    ${importUsersMutation.isPending 
                                        ? 'bg-gray-300 cursor-wait' 
                                        : 'bg-[#217346] hover:bg-[#1a5f38] text-white border border-[#1a5f38]'}
                                    `}
                                disabled={importUsersMutation.isPending}
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
                                
                                {importUsersMutation.isPending ? (
                                    <span className="text-base">Импорт...</span>
                                ) : (
                                    <span className="text-base">Импорт</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

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