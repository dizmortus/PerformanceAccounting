'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const decoded = jwtDecode(token);
            
            // Проверяем статус из токена
            if (decoded.status === 'Заблокированный') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setError('Ваш аккаунт заблокирован. Обратитесь к администратору.');
                return;
            }

            // Перенаправление по роли
            if (decoded.role === 'Администратор') {
                router.push('/admin');
            } else if (decoded.role === 'Преподаватель') {
                router.push('/teacher');
            }
        } catch (error) {
            console.error('Ошибка декодирования токена:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Ошибка входа');
            }

            const decoded = jwtDecode(data.accessToken);
            
            // Проверка статуса после входа
            if (decoded.status === 'Заблокированный') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                throw new Error('Ваш аккаунт заблокирован. Обратитесь к администратору.');
            }

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            // Перенаправление по роли
            if (decoded.role === 'Администратор') {
                router.push('/admin');
            } else if (decoded.role === 'Преподаватель') {
                router.push('/teacher');
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-teal-300 to-blue-400 px-4 sm:px-8">
            <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-3xl font-semibold text-center text-gray-900 mb-6">Учет успеваемости студентов</h2>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            placeholder="Логин"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-gray-600 text-sm">
                    <p>Если у вас нет аккаунта, обратитесь к администратору системы для получения доступа.</p>
                </div>
            </div>
        </div>
    );
}