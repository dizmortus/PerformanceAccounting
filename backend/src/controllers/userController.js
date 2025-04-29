import { User } from "../models/index.js";
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js'; 
import { Faculty, Statement, Lesson } from "../models/index.js"; // путь скорректируйте под ваш проект

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
};
export const updateUser = async (req, res) => {
    const { login: oldLogin } = req.params;
    const newData = req.body;

    try {
        // Начинаем транзакцию
        const result = await sequelize.transaction(async (t) => {
            // 1. Находим пользователя по старому логину
            const user = await User.findOne({
                where: { login: oldLogin },
                transaction: t
            });
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // 2. Удаляем служебные поля из данных для обновления
            const updateData = { ...newData };
            delete updateData.oldLogin;

            // 3. Проверяем уникальность нового логина, если он изменяется
            if (updateData.login && updateData.login !== oldLogin) {
                const existingUser = await User.findOne({
                    where: { login: updateData.login },
                    transaction: t
                });
                
                if (existingUser) {
                    throw new Error('Пользователь с таким логином уже существует');
                }
            }

            // 4. Проверяем уникальность email, если он изменяется
            if (updateData.email && updateData.email !== user.email) {
                const existingEmail = await User.findOne({
                    where: { email: updateData.email },
                    transaction: t
                });
                
                if (existingEmail) {
                    throw new Error('Пользователь с таким email уже существует');
                }
            }

            // 5. Если логин не меняется, просто обновляем данные
            if (!updateData.login || updateData.login === oldLogin) {
                await user.update(updateData, { transaction: t });
                return { success: true };
            }

            // 6. Если логин меняется - сначала обновляем остальные поля
            const fieldsToUpdate = { ...updateData };
            delete fieldsToUpdate.login;

            if (Object.keys(fieldsToUpdate).length > 0) {
                await user.update(fieldsToUpdate, { transaction: t });
            }

            // 7. Затем обновляем логин с помощью прямого SQL-запроса
            await sequelize.query(
                'UPDATE "Пользователи" SET "Логин" = :newLogin WHERE "Логин" = :oldLogin', 
                {
                    replacements: { 
                        newLogin: updateData.login, 
                        oldLogin: oldLogin 
                    },
                    transaction: t
                }
            );

            return { success: true };
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message || 'Ошибка при обновлении пользователя' 
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


export const changeUserPassword = async (req, res) => {
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

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import validator from 'validator';

// Функции для шифрования/дешифрования
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Проверяет валидность email и пароля через SMTP
 */
async function verifySMTPCredentials(email, password) {
    try {
        const testTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
                user: email,
                pass: password
            },
            logger: false,
            debug: false,
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            }
        });

        await testTransporter.verify();
        return true;
    } catch (error) {
        console.error('SMTP verification failed:', error);
        return false;
    }
}

/**
 * Устанавливает или обновляет почту и пароль почты для пользователя
 */
/**
 * Устанавливает или обновляет почту и пароль почты для пользователя
 */
export const setUserEmailAndPassword = async (req, res) => {
    const { email, emailPassword } = req.body;
    const { login } = req.user;
    if (!login) {
        return res.status(401).json({ success: false, error: "Не удалось определить пользователя" });
    }

    try {
        // 1. Проверяем наличие пользователя
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ success: false, error: "Пользователь не найден" });
        }

        // 2. Проверяем email на валидность
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({ success: false, error: "Некорректный формат email" });
        }

        // 3. Проверяем SMTP
        if (email && emailPassword) {
            const credentialsValid = await verifySMTPCredentials(email, emailPassword);
            if (!credentialsValid) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Неверные учетные данные SMTP. Проверьте email и пароль." 
                });
            }
        }

        // 4. Шифруем пароль
        const encryptedPassword = emailPassword ? encrypt(emailPassword) : null;

        // 5. Обновляем данные
        await user.update({
            email: email || null,
            emailPassword: encryptedPassword
        });

        // 6. Возвращаем обновлённые данные
        const updatedUser = await User.findOne({
            where: { login },
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId']
        });

        res.json({
            success: true,
            message: "Данные почты успешно обновлены",
            user: updatedUser
        });

    } catch (error) {
        console.error("Ошибка при обновлении почты:", error);
        res.status(500).json({
            success: false,
            error: "Ошибка сервера при обновлении почты",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const hasUserDependencies = async (req, res) => {
    const { login } = req.params;

    try {
        const statementsAsTeacherCount = await Statement.count({
            where: { teacherLogin: login }
        });
        
        const statementsAsClassTeacherCount = await Statement.count({
            where: { classTeacherLogin: login }
        });
        
        // Remove the lessonsCount check or replace with proper association
        const hasDependencies = statementsAsTeacherCount > 0 || 
                              statementsAsClassTeacherCount > 0;

        res.json({
            hasDependencies,
            details: {
                hasStatementsAsTeacher: statementsAsTeacherCount > 0,
                hasStatementsAsClassTeacher: statementsAsClassTeacherCount > 0,
                hasLessons: false, // or implement proper check
                totalDependencies: statementsAsTeacherCount + statementsAsClassTeacherCount
            }
        });
    } catch (error) {
        console.error("Ошибка при проверке зависимостей пользователя:", error);
        res.status(500).json({
            error: "Ошибка сервера при проверке зависимостей пользователя",
            details: error.message
        });
    }
};