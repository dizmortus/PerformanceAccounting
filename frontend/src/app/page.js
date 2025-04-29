'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        console.log('🔹 Токен из localStorage:', token);

        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const userRole = decodedToken.role;

                // Добавлено перенаправление для гостя
                if (userRole === 'Администратор') {
                    router.push('/admin');
                } else if (userRole === 'Преподаватель') {
                    router.push('/teacher');
                } else if (userRole === 'Гость') {
                    router.push('/guest');
                } else {
                    console.log('Неизвестная роль');
                    router.push('/login');
                }
            } catch (error) {
                console.error('Ошибка при декодировании токена', error);
                router.push('/login');
            }
        } else {
            router.push('/login');
        }
    }, [router]);

    return <div>Загрузка...</div>;
}