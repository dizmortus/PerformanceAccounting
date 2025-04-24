import { User } from "../models/index.js";
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js'; 
import { Faculty } from "../models/index.js"; // путь скорректируйте под ваш проект

export const getAllUsers = async (req, res) => {
    try {
        console.log('--- START getAllUsers ---');
        console.log('Current user:', {
            login: req.user.login,
            role: req.user.role,
            facultyId: req.user.facultyId
        });

        let whereCondition = {};

        if (req.user.facultyId) {
            console.log('Applying faculty filter. FacultyID:', req.user.facultyId);
            whereCondition.facultyId = req.user.facultyId;
        }

        console.log('Final whereCondition:', whereCondition);

        const users = await User.findAll({
            where: whereCondition,
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId']
        });

        console.log('Found users:', users.map(u => ({
            login: u.login,
            facultyId: u.facultyId
        })));
        console.log('--- END getAllUsers ---');

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
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId']
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
            attributes: { exclude: ['passwordHash', 'refreshToken'] }
        });

        if (!user) {
            console.log("Пользователь не найден:", req.user.login);
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        console.log("Информация о пользователе:", user.toJSON());
        res.json(user);
    } catch (error) {
        console.error("Ошибка сервера:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

export const getPossibleStatuses = async (req, res) => {
    try {
        console.log("Fetching possible statuses...");
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
        console.log("Fetching possible roles...");
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
};// Обновленный обработчик для PUT /api/users/:oldLogin
export const updateUser = async (req, res) => {
    const { oldLogin } = req.body;
    const { login: newLogin, email, lastName, firstName, patronymic, role, status, facultyId } = req.body;

    try {
        // 1. Проверяем наличие пользователя
        const user = await User.findOne({ where: { 'Логин': oldLogin } });
        if (!user) {
            return res.status(404).json({ success: false, error: "Пользователь не найден" });
        }

        // 2. Проверяем, не занят ли новый логин
        if (newLogin && newLogin !== oldLogin) {
            const existingUser = await User.findOne({ where: { 'Логин': newLogin } });
            if (existingUser) {
                return res.status(400).json({ success: false, error: "Пользователь с таким логином уже существует" });
            }
        }

        // 3. Проверка факультета
        if (facultyId) {
            const faculty = await Faculty.findByPk(facultyId);
            if (!faculty) {
                return res.status(404).json({ success: false, error: "Факультет не найден" });
            }
        }

        // 4. Обновление данных
        if (newLogin === oldLogin) {
            // Логин не меняется — обычное обновление
            await user.update({
                'Почта': email,
                'Фамилия': lastName,
                'Имя': firstName,
                'Отчество': patronymic || null,
                'Роль': role,
                'Статус': status,
                'ID Факультета': facultyId
            });
        } else {
            // Логин меняется — обновляем через raw query
            await User.sequelize.query(
                'UPDATE "Пользователи" SET "Логин" = ?, "Почта" = ?, "Фамилия" = ?, "Имя" = ?, "Отчество" = ?, "Роль" = ?, "Статус" = ?, "ID Факультета" = ? WHERE "Логин" = ?',
                {
                    replacements: [newLogin, email, lastName, firstName, patronymic || null, role, status, facultyId, oldLogin],
                    type: User.sequelize.QueryTypes.UPDATE
                }
            );
        }

        // 5. Возвращаем обновлённые данные
        const updatedUser = await User.findOne({
            where: { 'Логин': newLogin || oldLogin },
            attributes: [
                ['Логин', 'login'],
                ['Почта', 'email'],
                ['Фамилия', 'lastName'],
                ['Имя', 'firstName'],
                ['Отчество', 'patronymic'],
                ['Роль', 'role'],
                ['Статус', 'status'],
                ['ID Факультета', 'facultyId']
            ],
            raw: true
        });

        res.json({
            success: true,
            message: "Данные пользователя успешно обновлены",
            user: updatedUser
        });

    } catch (error) {
        console.error("Ошибка при обновлении пользователя:", error);
        res.status(500).json({
            success: false,
            error: "Ошибка сервера при обновлении пользователя",
            details: error.message
        });
    }
};


export const createUser = async (req, res) => {
    const { login, email, password, lastName, firstName, patronymic, role, status } = req.body;

    console.log("Данные запроса:", req.body);

    try {
        const existingUser = await User.findOne({ where: { login } });
        if (existingUser) {
            return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
        }

        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Пароль обязателен и должен быть строкой" });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            login,
            email,
            passwordHash,
            lastName,
            firstName,
            patronymic,
            role: role || "Преподаватель",
            status: status || "Активный",
            facultyId: req.user.facultyId || null // Устанавливаем факультет текущего пользователя
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
        let whereCondition = { role: "Преподаватель" };

        if (req.user.facultyId) {
            console.log("Применяется фильтр по факультету:", req.user.facultyId);
            whereCondition.facultyId = req.user.facultyId;
        }

        const teachers = await User.findAll({
            where: whereCondition,
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId']
        });

        if (!teachers || teachers.length === 0) {
            console.log("Преподаватели не найдены.");
            return res.status(404).json({ error: "Преподаватели не найдены" });
        }

        console.log("Запрос на получение всех преподавателей успешно завершен.");
        res.json(teachers);
    } catch (error) {
        console.error("Ошибка при получении преподавателей:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};


export const changePassword = async (req, res) => {
    const { login } = req.user;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Текущий пароль неверен" });
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        await user.update({ passwordHash: newPasswordHash });
        res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
        console.error("Ошибка при смене пароля:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};
