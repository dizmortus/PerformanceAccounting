"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
        role: "Преподаватель",
        newPassword: "",
        isBlocked: false,
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [emailError, setEmailError] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

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
                    status: localUser.isBlocked ? "Заблокированный" : "Активный"
                });
            }
        }
    });

    // Mutation for creating user
    const createUserMutation = useMutation({
        mutationFn: createUser,
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

    const handleChange = (e, field) => {
        const value = e.target.value;
        setLocalUser((prev) => ({
            ...prev,
            [field]: value,
        }));

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
    };

    const handleBlockToggle = () => {
        setLocalUser((prev) => ({
            ...prev,
            isBlocked: !prev.isBlocked,
        }));
    };

    const handleCreate = async () => {
        const requiredFields = ["login", "lastName", "firstName", "email", "newPassword"];
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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(localUser.email)) {
            setEmailError("Введите корректный email");
            return;
        }

        // Start the user creation process by first checking login existence
        checkUserMutation.mutate(localUser.login);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-xl font-semibold mb-4">Создание нового пользователя</h2>
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
                            <select
                                value={localUser.role}
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

                    <div className="flex justify-end space-x-4 mt-6">

                        <button
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 transition"
                            onClick={handleCreate}
                            disabled={checkUserMutation.isPending || createUserMutation.isPending}
                        >
                            {checkUserMutation.isPending || createUserMutation.isPending 
                                ? "Создание..." 
                                : "Создать"}
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