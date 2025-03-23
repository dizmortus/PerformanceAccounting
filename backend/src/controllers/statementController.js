import { Statement, Group, Specialty } from "../models/index.js";
import { Op } from "sequelize";


/**
 * Получение ведомостей преподавателя
 */
export const getTeacherStatements = async (req, res) => {
    try {
        const { login } = req.user; // Получаем логин преподавателя из JWT

        const statements = await Statement.findAll({
            where: { teacherLogin: login },
            attributes: [
                "id",
                "teacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester",
                "assessmentType",
                "list"
            ]
        });

        res.json(statements);
    } catch (error) {
        console.error("Ошибка при получении ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Проверка наличия ведомостей у преподавателя
 */
export const hasTeacherStatements = async (teacherLogin) => {
    try {
        const statements = await Statement.findOne({
            where: { teacherLogin },
        });

        return !!statements; // Возвращает true, если ведомости найдены, иначе false
    } catch (error) {
        console.error("Ошибка при проверке ведомостей преподавателя:", error);
        throw error; // Пробрасываем ошибку для обработки в вызывающем коде
    }
};

/**
 * Создание новой ведомости
 */
export const createStatement = async (req, res) => {
    try {
        const { teacherLogin, disciplineId, groupId, practiceHours, semester, assessmentType, list } = req.body;

        // Проверка обязательных полей
        if (!teacherLogin || !disciplineId || !groupId || !practiceHours || !semester || !assessmentType) {
            return res.status(400).json({ error: "Все обязательные поля должны быть заполнены" });
        }

        // Получение ID специальности и факультета
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        const specialty = await Specialty.findByPk(group.specialtyId);
        if (!specialty) {
            return res.status(404).json({ error: "Специальность не найдена" });
        }

        const facultyId = specialty.facultyId; // facultyId — число

        // Преобразуем facultyId в строку с фиксированной длиной (например, 3 цифры)
        const facultyIdStr = facultyId.toString().padStart(3, '0'); // Гарантируем 3 цифры

        // Поиск максимального ID среди ведомостей, начинающихся с кода факультета
        const maxIdStatement = await Statement.findOne({
            where: {
                id: {
                    [Op.between]: [facultyId * 1000000, (facultyId + 1) * 1000000 - 1] // Диапазон для facultyId
                }
            },
            order: [['id', 'DESC']], // Сортируем по убыванию
            attributes: ['id'] // Выбираем только поле id
        });

        // Генерация нового ID ведомости
        let newStatementId;
        if (maxIdStatement) {
            const lastId = maxIdStatement.id.toString(); // Преобразуем ID в строку
            const lastNumber = parseInt(lastId.slice(3), 10); // Извлекаем номер ведомости (последние 6 цифр)
            newStatementId = parseInt(`${facultyIdStr}${(lastNumber + 1).toString().padStart(6, '0')}`, 10); // Увеличиваем номер на 1 и формируем новый ID
        } else {
            newStatementId = parseInt(`${facultyIdStr}000001`, 10); // Первая ведомость для факультета
        }

        // Создание новой ведомости
        const newStatement = await Statement.create({
            id: newStatementId,
            teacherLogin,
            disciplineId,
            groupId,
            practiceHours,
            semester,
            assessmentType,
            list: list || null,
        });

        res.status(201).json(newStatement);
    } catch (error) {
        console.error("Ошибка при создании ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};
/**
 * Изменение ведомости
 */
export const updateStatement = async (req, res) => {
    try {
        const { id } = req.params; // ID ведомости
        const { teacherLogin, disciplineId, groupId, practiceHours, semester, assessmentType, list } = req.body;

        // Поиск ведомости по ID
        const statement = await Statement.findByPk(id);
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        // Обновление данных ведомости
        statement.teacherLogin = teacherLogin || statement.teacherLogin;
        statement.disciplineId = disciplineId || statement.disciplineId;
        statement.groupId = groupId || statement.groupId;
        statement.practiceHours = practiceHours || statement.practiceHours;
        statement.semester = semester || statement.semester;
        statement.assessmentType = assessmentType || statement.assessmentType;
        statement.list = list || statement.list;

        await statement.save(); // Сохранение изменений

        res.json(statement);
    } catch (error) {
        console.error("Ошибка при изменении ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Удаление ведомости
 */
export const deleteStatement = async (req, res) => {
    try {
        const { id } = req.params; // ID ведомости

        // Поиск ведомости по ID
        const statement = await Statement.findByPk(id);
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        // Удаление ведомости
        await statement.destroy();

        res.json({ message: "Ведомость успешно удалена" });
    } catch (error) {
        console.error("Ошибка при удалении ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};
export const getAllStatements = async (req, res) => {
    try {
        const statements = await Statement.findAll({
            attributes: [
                "id",
                "teacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester",
                "assessmentType",
                "list"
            ]
        });

        res.json(statements);
    } catch (error) {
        console.error("Ошибка при получении всех ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};