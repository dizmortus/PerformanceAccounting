import { User } from "../models/index.js";
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status']
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

export const getUserByLogin = async (req, res) => {
    const { login } = req.params;
    try {
        const user = await User.findOne({
            where: { login: login },
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status']
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { login: req.user.login },
            attributes: { exclude: ['passwordHash', 'refreshToken'] } // Исключаем пароль и токен
        });

        if (!user) {
            console.log("Пользователь не найден:", req.user.login);
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        console.log("Информация о пользователе:", user.toJSON()); // Логируем информацию о пользователе
        
        res.json(user);

    } catch (error) {
        console.error("Ошибка сервера:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// ... существующие методы ...

export const getPossibleStatuses = async (req, res) => {
    try {
        console.log("Fetching possible statuses..."); // Логирование
        const statuses = User.rawAttributes.status.values;
        if (!statuses) {
            return res.status(404).json({ error: "Статусы не найдены" });
        }
        res.json(statuses);
    } catch (error) {
        console.error("Error fetching possible statuses:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

export const getPossibleRoles = async (req, res) => {
    try {
        console.log("Fetching possible roles..."); // Логирование
        const roles = User.rawAttributes.role.values;
        if (!roles) {
            return res.status(404).json({ error: "Роли не найдены" });
        }
        res.json(roles);
    } catch (error) {
        console.error("Error fetching possible roles:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

// Удаление пользователя
export const deleteUser = async (req, res) => {
    const { login } = req.params;
    try {
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        
        await user.destroy();
        res.json({ message: "Пользователь успешно удален" });
    } catch (error) {
        console.error("Ошибка при удалении пользователя:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

// Обновление данных пользователя
export const updateUser = async (req, res) => {
    const { login } = req.params;
    const { email, lastName, firstName, patronymic, role, status, newPassword } = req.body;

    try {
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        // Если передан новый пароль, хешируем его
        let passwordHash = user.passwordHash;
        if (newPassword) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(newPassword, saltRounds);
        }

        await user.update({
            email: email || user.email,
            lastName: lastName || user.lastName,
            firstName: firstName || user.firstName,
            patronymic: patronymic || user.patronymic,
            role: role || user.role,
            status: status || user.status,
            passwordHash,
        });

        res.json({ message: "Данные пользователя обновлены" });
    } catch (error) {
        console.error("Ошибка при обновлении пользователя:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

// Создание нового пользователя
export const createUser = async (req, res) => {
    const { login, email, password, lastName, firstName, patronymic, role, status } = req.body;

    console.log("Данные запроса:", req.body); // Логируем данные запроса

    try {
        // Проверяем, существует ли пользователь с таким логином
        const existingUser = await User.findOne({ where: { login } });
        if (existingUser) {
            return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
        }

        // Проверяем, передан ли пароль
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Пароль обязателен и должен быть строкой" });
        }

        // Хешируем пароль
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Создаем нового пользователя
        const newUser = await User.create({
            login,
            email,
            passwordHash,
            lastName,
            firstName,
            patronymic,
            role: role || "Преподаватель",
            status: status || "Активный",
        });

        res.status(201).json({ message: "Пользователь создан", user: newUser });
    } catch (error) {
        console.error("Ошибка при создании пользователя:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

export const getAllTeachers = async (req, res) => {
    console.log("Запрос на получение всех преподавателей начат.");
    try {
        // Логируем начало выполнения запроса к базе данных
        console.log("Попытка получить всех преподавателей из базы данных...");

        // Получаем всех преподавателей без пагинации и сортировки
        const teachers = await User.findAll({
            where: { role: "Преподаватель" },
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status']
        });

        // Логируем результат запроса
        console.log(`Получено преподавателей: ${teachers.length}`);

        // Если преподаватели не найдены, возвращаем пустой массив
        if (!teachers || teachers.length === 0) {
            console.log("Преподаватели не найдены.");
            return res.status(404).json({ error: "Преподаватели не найдены" });
        }

        // Логируем успешное завершение запроса
        console.log("Запрос на получение всех преподавателей успешно завершен.");

        // Возвращаем список преподавателей
        res.json(teachers);
    } catch (error) {
        // Логируем ошибку
        console.error("Ошибка при получении преподавателей:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

// Добавляем новый метод в controllers/userController.js
export const changePassword = async (req, res) => {
    const { login } = req.user; // Получаем логин из аутентифицированного пользователя
    const { currentPassword, newPassword } = req.body;

    try {
        // 1. Находим пользователя
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        // 2. Проверяем текущий пароль
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Текущий пароль неверен" });
        }

        // 3. Хешируем новый пароль
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Обновляем пароль
        await user.update({ passwordHash: newPasswordHash });

        // 5. Возвращаем успешный ответ
        res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
        console.error("Ошибка при смене пароля:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};