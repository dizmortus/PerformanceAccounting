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
        
        if (decodedToken.status === 'Заблокированный') {
            console.warn("Пользователь заблокирован. Перенаправление на страницу логина.");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            router.push("/login");
            return { isAuthenticated: false, login: '' };
        }

        const userRole = decodedToken.role;
        const roleMismatch = 
            (requiredRole === "admin" && userRole !== "Администратор") ||
            (requiredRole === "teacher" && userRole !== "Преподаватель") ||
            (requiredRole === "guest" && userRole !== "Гость");

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

/**
 * Инициирует процесс сброса пароля
 * @param {string} login - Логин пользователя
 * @returns {Promise<{message: string, maskedEmail: string, expiresIn: number}>}
 */
export const initiatePasswordReset = async (login) => {
    try {
        const response = await fetch('/api/auth/initiate-password-reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Не удалось инициировать сброс пароля');
        }

        return data;
    } catch (error) {
        //console.error('Ошибка при инициации сброса пароля:', error);
        throw new Error(error.message);
    }
};

export const verifyResetCode = async (login, code) => {
    try {
        const response = await fetch('/api/auth/verify-reset-code', {  // Добавлен /api/
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login, code })
        });

        // Проверяем content-type перед парсингом JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(text || 'Неверный ответ сервера');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Не удалось подтвердить код');
        }

        return data;
    } catch (error) {
        //console.error('Ошибка при подтверждении кода:', error);
        throw new Error(error.message);
    }
};

/**
 * Устанавливает новый пароль после подтверждения кода
 * @param {string} login - Логин пользователя
 * @param {string} newPassword - Новый пароль
 * @returns {Promise<{message: string, status: string}>}
 */
export const changePasswordAfterReset = async (login, newPassword) => {
    console.log('changePasswordAfterReset вызван с параметрами:', { login, newPassword });

    try {
        const requestBody = JSON.stringify({ login, newPassword });
        console.log('Отправка запроса на /api/auth/change-password с body:', requestBody);

        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody,
        });

        console.log('Ответ сервера получен:', response.status, response.statusText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('Ошибка в ответе сервера:', errorData);
            } catch (jsonError) {
                console.error('Ошибка при чтении тела ошибки:', jsonError);
            }
            throw new Error(errorData?.error || 'Не удалось изменить пароль');
        }

        const responseData = await response.json();
        console.log('Успешный ответ сервера:', responseData);

        return responseData;
    } catch (error) {
        console.error('Ошибка при смене пароля:', error);
        throw error;
    }
};
