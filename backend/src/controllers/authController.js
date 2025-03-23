//backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import dotenv from "dotenv";
dotenv.config();

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// 🔹 Логин пользователя
export const login = async (req, res) => {
    const { login, password } = req.body;

    try {
        const user = await User.findOne({ where: { login } });

        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Генерация токенов
        const accessToken = jwt.sign({ login: user.login, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ login: user.login }, REFRESH_SECRET, { expiresIn: '7d' });

        // Обновляем refresh-токен в базе
        await User.update({ refreshToken }, { where: { login } });

        return res.json({ message: 'Успешный вход', accessToken, refreshToken });
    } catch (error) {
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// 🔹 Регистрация пользователя
export const register = async (req, res) => {
    const { login, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ where: { login } });
        if (existingUser) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Генерация токенов
        const accessToken = jwt.sign({ login, role }, ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ login }, REFRESH_SECRET, { expiresIn: '7d' });

        await User.create({
            login,
            passwordHash: hashedPassword,
            role,
            refreshToken
        });

        return res.status(201).json({ message: 'Регистрация успешна', accessToken, refreshToken });
    } catch (error) {
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// 🔹 Обновление access-токена
export const refreshToken = async (req, res) => {
    try {
        // Получаем refresh token из тела запроса
        const { refreshToken } = req.body;

        if (!refreshToken) {
            console.error("❌ Ошибка 401: Отсутствует refresh-токен");
            return res.status(401).json({ error: "Отсутствует refresh-токен" });
        }

        // Проверяем, есть ли такой refresh-токен в базе данных
        const user = await User.findOne({ where: { refreshToken } });
        if (!user) {
            console.error("❌ Ошибка 403: Недействительный refresh-токен");
            return res.status(403).json({ error: "Недействительный refresh-токен" });
        }

        // Проверяем refresh-токен
        try {
            jwt.verify(refreshToken, REFRESH_SECRET);
        } catch (error) {
            console.error("❌ Ошибка 403: Refresh-токен истек или недействителен", error.message);
            return res.status(403).json({ error: "Refresh-токен истек или недействителен" });
        }

        // Генерируем новый access-токен
        const newAccessToken = jwt.sign(
            { login: user.login, role: user.role },
            ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        // Возвращаем новый access-токен клиенту
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        console.error("❌ Ошибка сервера:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};




// 🔹 Выход пользователя
export const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Некорректный заголовок авторизации" });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, ACCESS_SECRET);
        } catch (error) {
            return res.status(403).json({ error: "Неверный или просроченный токен" });
        }

        const user = await User.findOne({ where: { login: decoded.login } });

        if (!user) {
            return res.status(403).json({ error: "Пользователь не найден" });
        }

        // Удаляем refresh-токен из БД
        await User.update({ refreshToken: null }, { where: { login: user.login } });

        res.json({ message: "Выход выполнен успешно" });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
};
