'use client';
import { useState } from 'react';
import {
    FaUser, FaCog, FaSignOutAlt, FaTimes,
    FaLock, FaEnvelope, FaArrowLeft
} from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { changePassword, updateEmail } from '../utils/api';
import validator from 'validator';

const UserProfile = ({ login, userEmail, onLogout }) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('password');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showEmailPassword, setShowEmailPassword] = useState(false);

    const [email, setEmail] = useState(userEmail || '');
    const [emailPassword, setEmailPassword] = useState('');

    const passwordMutation = useMutation({
        mutationFn: () => changePassword(currentPassword, newPassword),
        onSuccess: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
    });

    const emailMutation = useMutation({
        mutationFn: () => updateEmail(email, emailPassword),
        onSuccess: () => {
            setEmailPassword('');
        },
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            passwordMutation.reset();
            passwordMutation.error = new Error('Новый пароль и подтверждение не совпадают');
            return;
        }
        await passwordMutation.mutateAsync();
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        if (!validator.isEmail(email)) {
            emailMutation.reset();
            emailMutation.error = new Error('Введите корректный email');
            return;
        }
        await emailMutation.mutateAsync();
    };

    const closeModal = () => {
        setModalOpen(false);
        passwordMutation.reset();
        emailMutation.reset();
    };

    return (
        <>
            <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center space-x-3 border">
                <span className="text-gray-900 font-semibold">{login}</span>
                <button
                    className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                >
                    <FaUser />
                </button>

                {settingsOpen && (
                    <div className="absolute right-0 top-16 w-48 bg-white border rounded-lg shadow-lg p-2 z-10">
                        <button
                            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 flex items-center space-x-2 rounded"
                            onClick={() => {
                                setActiveTab('password');
                                setModalOpen(true);
                                setSettingsOpen(false);
                            }}
                        >
                            <FaLock />
                            <span>Сменить пароль</span>
                        </button>
                        <button
                            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 flex items-center space-x-2 rounded"
                            onClick={() => {
                                setActiveTab('email');
                                setModalOpen(true);
                                setSettingsOpen(false);
                            }}
                        >
                            <FaEnvelope />
                            <span>Привязать почту</span>
                        </button>
                        <button
                            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 flex items-center space-x-2 rounded"
                            onClick={onLogout}
                        >
                            <FaSignOutAlt />
                            <span>Выйти</span>
                        </button>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-open">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center border-b p-4">
                            <div className="flex items-center space-x-2">
                                {activeTab === 'email' && (
                                    <button
                                        onClick={() => setActiveTab('password')}
                                        className="text-gray-500 hover:text-gray-700 mr-2"
                                    >
                                        <FaArrowLeft />
                                    </button>
                                )}
                                <h3 className="text-lg font-semibold">
                                    {activeTab === 'password' ? 'Смена пароля' : 'Привязка почты'}
                                </h3>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700"
                                disabled={passwordMutation.isPending || emailMutation.isPending}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6">
                            {(passwordMutation.isError || emailMutation.isError) && (
                                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                                    {passwordMutation.error?.message || emailMutation.error?.message}
                                </div>
                            )}

                            {(passwordMutation.isSuccess || emailMutation.isSuccess) && (
                                <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
                                    {activeTab === 'password'
                                        ? 'Пароль успешно изменен'
                                        : 'Почта успешно привязана'}
                                </div>
                            )}

                            {activeTab === 'password' && (
                                <form onSubmit={handlePasswordChange}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">Текущий пароль</label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                disabled={passwordMutation.isPending}
                                                required
                                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                            >
                                                {showCurrentPassword ? "👁" : "👁‍🗨"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">Новый пароль</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                disabled={passwordMutation.isPending}
                                                required
                                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                            >
                                                {showNewPassword ? "👁" : "👁‍🗨"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">Подтвердите новый пароль</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                disabled={passwordMutation.isPending}
                                                required
                                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                            >
                                                {showConfirmPassword ? "👁" : "👁‍🗨"}
                                            </button>
                                        </div>
                                    </div>
                                    <ActionButtons
                                        isPending={passwordMutation.isPending}
                                        onCancel={closeModal}
                                    />
                                </form>
                            )}

                            {activeTab === 'email' && (
                                <form onSubmit={handleEmailUpdate}>
                                    <InputField
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={setEmail}
                                        disabled={emailMutation.isPending}
                                    />
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">Пароль от почты</label>
                                        <div className="relative">
                                            <input
                                                type={showEmailPassword ? "text" : "password"}
                                                value={emailPassword}
                                                onChange={(e) => setEmailPassword(e.target.value)}
                                                disabled={emailMutation.isPending}
                                                required
                                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowEmailPassword(!showEmailPassword)}
                                                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
                                            >
                                                {showEmailPassword ? "👁" : "👁‍🗨"}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Пароль будет зашифрован и безопасно сохранен</p>
                                    </div>
                                    <ActionButtons
                                        isPending={emailMutation.isPending}
                                        onCancel={closeModal}
                                        saveLabel="Привязать"
                                    />
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Переиспользуемый компонент поля ввода (упрощенная версия для email)
const InputField = ({ label, type, value, onChange, disabled, hint }) => (
    <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
);

// Переиспользуемые кнопки
const ActionButtons = ({ isPending, onCancel, saveLabel = 'Сохранить' }) => (
    <div className="flex justify-end space-x-3 mt-6">
        <button
            type="submit"
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
            disabled={isPending}
        >
            {isPending ? 'Сохранение...' : saveLabel}
        </button>

    </div>
);

export default UserProfile;