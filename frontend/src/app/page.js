'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';  // Измененный импорт

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');  // Получаем accessToken из localStorage
        console.log('🔹 Токен из localStorage:', token);  // Выводим токен в консоль

        if (token) {
            try {
                // Декодируем токен
                const decodedToken = jwtDecode(token);
                const userRole = decodedToken.role;  // Получаем роль из декодированного токена

                // Перенаправление в зависимости от роли
                if (userRole === 'admin') {
                    router.push('/admin');  // Перенаправление на страницу администратора
                } else if (userRole === 'teacher') {
                    router.push('/teacher');  // Перенаправление на страницу преподавателя
                } else {
                    console.log('Неизвестная роль');
                    router.push('/login');  // Перенаправление на страницу логина, если роль неизвестна
                }
            } catch (error) {
                console.error('Ошибка при декодировании токена', error);
                router.push('/login');  // Перенаправление на страницу логина в случае ошибки с токеном
            }
        } else {
            router.push('/login');  // Перенаправление на страницу логина, если токен отсутствует
        }
    }, [router]);  // Этот useEffect будет срабатывать при изменении router

    return <div>Загрузка...</div>;  // Можно добавить индикатор загрузки, если необходимо
}
