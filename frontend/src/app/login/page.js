'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
 // Исправленный импорт

export default function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const userRole = decodedToken.role;
    
                // Перенаправление в зависимости от роли
                if (userRole === 'Администратор') {
                    router.push('/admin');
                } else if (userRole === 'Преподаватель') {
                    router.push('/teacher');
                } else {
                    console.warn('Неизвестная роль. Перенаправление на страницу логина.');
                    router.push('/login');
                }
            } catch (error) {
                console.error('Ошибка при декодировании токена:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                router.push('/login');
            }
        }
    }, [router]);

    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
    
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
    
            // Декодирование токена для получения роли
            const decodedToken = jwtDecode(data.accessToken);  // Используем jwtDecode
            const userRole = decodedToken.role;
    
            // Перенаправление на нужную страницу в зависимости от роли
            if (userRole === 'Администратор') {
                router.push('/admin');  // Перенаправление на страницу администратора
            } else if (userRole === 'Преподаватель') {
                router.push('/teacher');  // Перенаправление на страницу преподавателя
            } else {
                setError('Неизвестная роль');
            }
        } else {
            setError(data.error);
        }
    };
    

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-teal-300 to-blue-400 px-4 sm:px-8">
            <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-3xl font-semibold text-center text-gray-900 mb-6">Учет успеваемости студентов</h2>
                {error && <p className="text-red-600 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            placeholder="Логин"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold rounded-lg transition-colors duration-300 hover:from-teal-600 hover:to-blue-600"
                    >
                        Войти
                    </button>
                </form>
                <div className="mt-6 text-center text-gray-600 text-sm">
                    <p>Если у вас нет аккаунта, обратитесь к администратору системы для получения доступа.</p>
                </div>
            </div>
        </div>
    );
}
