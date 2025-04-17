'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    // Проверка авторизации при загрузке
    const { isError: authCheckError } = useQuery({
        queryKey: ['authCheck'],
        queryFn: async () => {
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!accessToken || !refreshToken) {
                return { isAuthenticated: false }; // Явное возвращение значения
            }

            try {
                const decodedAccess = jwtDecode(accessToken);
                const decodedRefresh = jwtDecode(refreshToken);
                
                // Проверяем срок действия refresh-токена
                const now = Date.now() / 1000;
                if (decodedRefresh.exp < now) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    return { isAuthenticated: false }; // Явное возвращение значения
                }

                // Проверяем статус из токена
                if (decodedAccess.status === 'Заблокированный') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    throw new Error('Ваш аккаунт заблокирован. Обратитесь к администратору.');
                }

                // Перенаправление по роли
                if (decodedAccess.role === 'Администратор') {
                    router.push('/admin');
                } else if (decodedAccess.role === 'Преподаватель') {
                    router.push('/teacher');
                }

                return { isAuthenticated: true }; // Явное возвращение значения
            } catch (error) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                return { isAuthenticated: false }; // Явное возвращение значения
            }
        },
        retry: false,
        staleTime: Infinity
    });

    // Остальной код остается без изменений...
    const loginMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Ошибка входа');
            }

            return await res.json();
        },
        onSuccess: (data) => {
            const decoded = jwtDecode(data.accessToken);
            
            if (decoded.status === 'Заблокированный') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                throw new Error('Ваш аккаунт заблокирован. Обратитесь к администратору.');
            }

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            if (decoded.role === 'Администратор') {
                router.push('/admin');
            } else if (decoded.role === 'Преподаватель') {
                router.push('/teacher');
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        loginMutation.mutate();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-teal-300 to-blue-400 px-4 sm:px-8">
            <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-3xl font-semibold text-center text-gray-900 mb-6">Учет успеваемости студентов</h2>
                
                {(authCheckError || loginMutation.isError) && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {authCheckError?.message || loginMutation.error?.message}
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
            autoComplete="username" // Added autocomplete for login
        />
    </div>
    <div>
        <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                required
                autoComplete="current-password" // Added autocomplete for password
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
    <button 
        type="submit" 
        className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600 disabled:opacity-50"
        disabled={loginMutation.isPending}
    >
        {loginMutation.isPending ? 'Вход...' : 'Войти'}
    </button>
</form>

                
                <div className="mt-6 text-center text-gray-600 text-sm">
                    <p>Если у вас нет аккаунта, обратитесь к администратору системы для получения доступа.</p>
                </div>
            </div>
        </div>
    );
}