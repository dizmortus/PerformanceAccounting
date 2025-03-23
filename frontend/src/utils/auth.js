import { refreshAccessToken,  } from './api';
import { jwtDecode } from 'jwt-decode';// Добавьте этот импорт
/**
 * Проверяет, авторизован ли пользователь и соответствует ли его роль текущей странице.
 * @param {string} requiredRole - Требуемая роль пользователя ("teacher" или "admin").
 * @param {object} router - Объект роутера Next.js.
 * @returns {Promise<{ isAuthenticated: boolean, login: string }>} - Объект с флагом авторизации и логином пользователя.
 */
export const checkAuth = async (requiredRole, router) => {
    let token = localStorage.getItem("accessToken");
    let refreshTokenValue = localStorage.getItem("refreshToken");

    // Если refreshToken отсутствует, перенаправляем на страницу логина
    if (!refreshTokenValue) {
        console.warn("Отсутствует refreshToken. Перенаправление на страницу логина.");
        router.push("/login");
        return { isAuthenticated: false, login: '' };
    }

    // Если accessToken отсутствует, пытаемся обновить его
    if (!token) {
        token = await refreshAccessToken(refreshTokenValue);
        if (!token) {
            console.warn("Не удалось обновить accessToken. Перенаправление на страницу логина.");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }
        localStorage.setItem("accessToken", token);
    }

    try {
        // Декодируем токен, чтобы получить роль
        const decodedToken = jwtDecode(token);
        const userRole = decodedToken.role;

        // Проверяем, соответствует ли роль требуемой
        if (requiredRole === "admin" && userRole !== "Администратор") {
            console.warn("Роль не соответствует. Перенаправление на страницу логина.");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }

        if (requiredRole === "teacher" && userRole !== "Преподаватель") {
            console.warn("Роль не соответствует. Перенаправление на страницу логина.");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }

        // Возвращаем флаг авторизации и логин пользователя
        return { isAuthenticated: true, login: decodedToken.login };
    } catch (error) {
        console.error("Ошибка при проверке авторизации:", error);
        router.push("/login");
        return { isAuthenticated: false, login: '' };
    }
};

