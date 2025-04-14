'use client';
import { useState } from 'react';
import { FaUser, FaCog, FaSignOutAlt, FaTimes, FaLock } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../utils/api';

const UserProfile = ({ login, onLogout }) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Мутация для изменения пароля с использованием React Query
    const passwordMutation = useMutation({
        mutationFn: () => changePassword(currentPassword, newPassword),
        onSuccess: () => {
            // Очищаем поля и закрываем модальное окно при успехе
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setModalOpen(false), 2000);
        },
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        // Валидация
        if (newPassword !== confirmPassword) {
            passwordMutation.reset();
            passwordMutation.error = new Error('Новый пароль и подтверждение не совпадают');
            return;
        }

        // Вызываем мутацию
        await passwordMutation.mutateAsync();
    };

    return (
        <>
            <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center space-x-3 border">
                <span className="text-gray-900 font-semibold">{login}</span>
                <button
                    className="p-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full hover:from-teal-600 hover:to-blue-600 transition relative group text-lg"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                >
                    <FaUser />
                </button>

                {/* Выпадающее меню */}
                {settingsOpen && (
                    <div className="mt-2 w-48 bg-white shadow-lg rounded-lg border p-2 absolute right-0 top-16 z-10">
                        <button
                            className="w-full px-4 py-2 text-gray-900 flex items-center space-x-2 hover:bg-gray-100 rounded"
                            onClick={() => {
                                setModalOpen(true);
                                setSettingsOpen(false);
                                passwordMutation.reset();
                            }}
                        >
                            <FaCog />
                            <span>Настройки</span>
                        </button>
                        <button
                            className="w-full px-4 py-2 text-gray-900 flex items-center space-x-2 hover:bg-gray-100 rounded"
                            onClick={onLogout}
                        >
                            <FaSignOutAlt />
                            <span>Выход</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Модальное окно смены пароля */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center border-b p-4">
                            <h3 className="text-lg font-semibold">Смена пароля</h3>
                            <button 
                                onClick={() => {
                                    setModalOpen(false);
                                    passwordMutation.reset();
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                disabled={passwordMutation.isPending}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6">
                            {passwordMutation.isError && (
                                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                                    {passwordMutation.error.message}
                                </div>
                            )}
                            
                            {passwordMutation.isSuccess && (
                                <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
                                    Пароль успешно изменен
                                </div>
                            )}

                            <form onSubmit={handlePasswordChange}>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        Текущий пароль
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        disabled={passwordMutation.isPending}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        Новый пароль
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={passwordMutation.isPending}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        Подтвердите новый пароль
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={passwordMutation.isPending}
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                <button
                                        type="submit"
                                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
                                        disabled={passwordMutation.isPending}
                                    >
                                        {passwordMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalOpen(false);
                                            passwordMutation.reset();
                                        }}
                                        className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100"
                                        disabled={passwordMutation.isPending}
                                    >
                                        Отмена
                                    </button>

                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserProfile;