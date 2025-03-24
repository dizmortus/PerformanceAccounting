// src/utils/auth.js
import { refreshAccessToken } from './api';
import { jwtDecode } from 'jwt-decode';

export const checkAuth = async (requiredRole, router) => {
    let token = localStorage.getItem("accessToken");
    let refreshTokenValue = localStorage.getItem("refreshToken");

    if (!refreshTokenValue) {
        console.warn("Отсутствует refreshToken. Перенаправление на страницу логина.");
        router.push("/login");
        return { isAuthenticated: false, login: '' };
    }

    if (!token) {
        try {
            token = await refreshAccessToken(refreshTokenValue);
            if (!token) {
                console.warn("Не удалось обновить accessToken. Перенаправление на страницу логина.");
                router.push("/login");
                return { isAuthenticated: false, login: '' };
            }
            localStorage.setItem("accessToken", token);
        } catch (error) {
            console.error("Ошибка при обновлении токена:", error);
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }
    }

    try {
        const decodedToken = jwtDecode(token);
        
        // Проверка статуса из токена
        if (decodedToken.status === 'Заблокированный') {
            console.warn("Пользователь заблокирован. Перенаправление на страницу логина.");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }

        // Проверка роли
        const userRole = decodedToken.role;
        const roleMismatch = 
            (requiredRole === "admin" && userRole !== "Администратор") ||
            (requiredRole === "teacher" && userRole !== "Преподаватель");

        if (roleMismatch) {
            console.warn("Роль не соответствует. Перенаправление на страницу логина.");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }

        return { isAuthenticated: true, login: decodedToken.login };
    } catch (error) {
        console.error("Ошибка при проверке авторизации:", error);
        router.push("/login");
        return { isAuthenticated: false, login: '' };
    }
};