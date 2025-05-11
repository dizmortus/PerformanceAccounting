import { User } from "../models/index.js";
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js'; 
import { Faculty, Statement, Lesson } from "../models/index.js";
export const getAllUsers = async (req, res) => {
    try {
        console.log('--- START getAllUsers ---');
        console.log('Current user:', {
            login: req.user.login,
            role: req.user.role,
            facultyId: req.user.facultyId
        });

        let whereCondition = {};

        // Фильтр по факультету (может быть передан в параметрах запроса или взят из текущего пользователя)
        const facultyId = req.query.facultyId || 
                         (req.query.sameFacultyOnly === 'true' ? req.user.facultyId : null);
        
        if (facultyId) {
            console.log('Applying faculty filter. FacultyID:', facultyId);
            whereCondition.facultyId = facultyId;
        }

        console.log('Final whereCondition:', whereCondition);

        // Получаем всех пользователей с информацией о факультетах
        const users = await User.findAll({
            where: whereCondition,
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId'],
            include: [{
                model: Faculty,
                as: 'faculty',
                attributes: ['id', 'name', 'abbreviation', 'deanLogin'],
                required: false
            }],
            order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        });

        // Формируем ответ
        const response = users.map(user => ({
            login: user.login,
            email: user.email,
            lastName: user.lastName,
            firstName: user.firstName,
            patronymic: user.patronymic,
            role: user.role,
            status: user.status,
            facultyId: user.facultyId,
            facultyName: user.faculty?.name || null,
            facultyAbbreviation: user.faculty?.abbreviation || null,
            isDean: user.faculty?.deanLogin === user.login
        }));

        console.log('Found users:', response.length);
        console.log('--- END getAllUsers ---');

        res.json(response);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

export const getAllTeachers = async (req, res) => {
    console.log("Запрос на получение всех преподавателей начат.");
    try {
        let whereCondition = { role: "Преподаватель" };

        // Фильтр по факультету
        const facultyId = req.query.facultyId || 
                         (req.query.sameFacultyOnly === 'true' ? req.user.facultyId : null);
        
        if (facultyId) {
            console.log("Применяется фильтр по факультету:", facultyId);
            whereCondition.facultyId = facultyId;
        }

        const teachers = await User.findAll({
            where: whereCondition,
            attributes: ['login', 'email', 'lastName', 'firstName', 'patronymic', 'role', 'status', 'facultyId'],
            include: [{
                model: Faculty,
                as: 'faculty',
                attributes: ['id', 'name', 'abbreviation'],
                required: false
            }],
            order: [['lastName', 'ASC'], ['firstName', 'ASC']]
        });

        if (!teachers || teachers.length === 0) {
            console.log("Преподаватели не найдены.");
            return res.status(404).json({ error: "Преподаватели не найдены" });
        }

        // Форматируем ответ
        const response = teachers.map(teacher => ({
            ...teacher.get({ plain: true }),
            facultyName: teacher.faculty?.name || null,
            facultyAbbreviation: teacher.faculty?.abbreviation || null
        }));

        console.log("Найдено преподавателей:", response.length);
        res.json(response);
    } catch (error) {
        console.error("Ошибка при получении преподавателей:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
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
};export const createUser = async (req, res) => {
    const { login, email, password, lastName, firstName, patronymic, role, status, isDean } = req.body;

    console.log("Данные запроса:", req.body);

    try {
        // Проверяем уникальность логина
        const existingUser = await User.findOne({ where: { login } });
        if (existingUser) {
            return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
        }

        // Валидация пароля
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Пароль обязателен и должен быть строкой" });
        }

        // Хешируем пароль
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Создаем пользователя в транзакции
        const result = await sequelize.transaction(async (t) => {
            const newUser = await User.create({
                login,
                email,
                passwordHash,
                lastName,
                firstName,
                patronymic,
                role: role || "Преподаватель",
                status: status || "Активный",
                facultyId: req.user.facultyId || null
            }, { transaction: t });

            // Если пользователь - декан и у него указан факультет
            if (isDean && newUser.facultyId) {
                const faculty = await Faculty.findOne({ 
                    where: { id: newUser.facultyId },
                    transaction: t 
                });
                
                if (!faculty) {
                    throw new Error('Указанный факультет не существует');
                }

                // Обновляем факультет, устанавливая декана
                await faculty.update({ deanLogin: newUser.login }, { transaction: t });
            }

            return newUser;
        });

        res.status(201).json({ message: "Пользователь создан", user: result });
    } catch (error) {
        console.error("Ошибка при создании пользователя:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { login: oldLogin } = req.params;
    const { isDean, ...newData } = req.body;

    try {
        // Начинаем транзакцию
        const result = await sequelize.transaction(async (t) => {
            // 1. Находим пользователя
            const user = await User.findOne({
                where: { login: oldLogin },
                transaction: t
            });
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // 2. Проверяем уникальность нового логина
            if (newData.login && newData.login !== oldLogin) {
                const existingUser = await User.findOne({
                    where: { login: newData.login },
                    transaction: t
                });
                
                if (existingUser) {
                    throw new Error('Пользователь с таким логином уже существует');
                }
            }

            // 3. Проверяем уникальность email
            if (newData.email && newData.email !== user.email) {
                const existingEmail = await User.findOne({
                    where: { email: newData.email },
                    transaction: t
                });
                
                if (existingEmail) {
                    throw new Error('Пользователь с таким email уже существует');
                }
            }

            // 4. Если пользователь становится деканом
            if (isDean && user.facultyId) {
                const faculty = await Faculty.findOne({ 
                    where: { id: user.facultyId },
                    transaction: t 
                });
                
                if (!faculty) {
                    throw new Error('Указанный факультет не существует');
                }

                // Обновляем факультет, устанавливая декана
                await faculty.update({ deanLogin: newData.login || oldLogin }, { transaction: t });
            }

            // 5. Если пользователь перестает быть деканом (необязательно, зависит от логики)
            if (isDean === false && user.facultyId) {
                const faculty = await Faculty.findOne({ 
                    where: { deanLogin: oldLogin },
                    transaction: t 
                });
                
                if (faculty) {
                    await faculty.update({ deanLogin: null }, { transaction: t });
                }
            }

            // 6. Обновляем данные пользователя
            if (!newData.login || newData.login === oldLogin) {
                await user.update(newData, { transaction: t });
                return { success: true };
            }

            // 7. Если меняется логин - сначала обновляем остальные поля
            const fieldsToUpdate = { ...newData };
            delete fieldsToUpdate.login;

            if (Object.keys(fieldsToUpdate).length > 0) {
                await user.update(fieldsToUpdate, { transaction: t });
            }

            // 8. Затем обновляем логин
            await sequelize.query(
                'UPDATE "Пользователи" SET "Логин" = :newLogin WHERE "Логин" = :oldLogin', 
                {
                    replacements: { 
                        newLogin: newData.login, 
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