import { Lesson, Statement } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Получение занятий по ведомости
 */
export const getLessonsByStatement = async (req, res) => {
    try {
        const { statementId } = req.params;

        // Проверяем, что statementId предоставлен и является числом
        if (!statementId || isNaN(statementId)) {
            return res.status(400).json({ error: "Неверный ID ведомости" });
        }

        const lessons = await Lesson.findAll({
            where: { 
                statementId: Number(statementId) // Явное приведение к числу
            },
            order: [['date', 'ASC']], // Сортировка по дате (от старых к новым)
            attributes: ["id", "statementId", "date"] // Выбираем только нужные поля
        });

        // Возвращаем пустой массив, если занятия не найдены
        res.json(lessons || []);
    } catch (error) {
        console.error("Ошибка при получении занятий:", error);
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message 
        });
    }
};

/**
 * Создание нового занятия
 */
export const createLesson = async (req, res) => {
    try {
        const { statementId, date } = req.body;

        if (!statementId || !date) {
            return res.status(400).json({ 
                success: false,
                error: "Все обязательные поля должны быть заполнены" 
            });
        }

        const statement = await Statement.findByPk(statementId);
        if (!statement) {
            return res.status(404).json({ 
                success: false,
                error: "Ведомость не найдена" 
            });
        }


        // Поиск максимального номера занятия для этой ведомости
        const lastLesson = await Lesson.findOne({
            where: {
                id: {
                    [Op.between]: [
                        Number(statementId) * 10 + 1,
                        Number(statementId) * 10 + 9999
                    ]
                }
            },
            order: [['id', 'DESC']],
            attributes: ['id']
        });

        // Генерация нового ID занятия
        let newLessonId;
        if (lastLesson) {
            const lastNumber = parseInt(lastLesson.id.toString().slice(statementId.toString().length));
            newLessonId = Number(statementId) * 10 + lastNumber + 1;
        } else {
            newLessonId = Number(statementId) * 10 + 1;
        }

        const newLesson = await Lesson.create({
            id: newLessonId,
            statementId,
            date
        });

        res.status(201).json({ 
            success: true,
            lesson: newLesson 
        });

    } catch (error) {
        console.error("Ошибка при создании занятия:", error);
        res.status(500).json({ 
            success: false,
            error: "Ошибка сервера" 
        });
    }
};

/**
 * Изменение занятия
 */
export const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.body;

        const lesson = await Lesson.findByPk(id);
        if (!lesson) {
            return res.status(404).json({ error: "Занятие не найдено" });
        }

        lesson.date = date || lesson.date;
        await lesson.save();

        res.json(lesson);
    } catch (error) {
        console.error("Ошибка при изменении занятия:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Удаление занятия
 */
export const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;

        const lesson = await Lesson.findByPk(id);
        if (!lesson) {
            return res.status(404).json({ error: "Занятие не найдено" });
        }

        await lesson.destroy();

        res.json({ message: "Занятие успешно удалено" });
    } catch (error) {
        console.error("Ошибка при удалении занятия:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Получение всех занятий преподавателя
 */
export const getTeacherLessons = async (req, res) => {
    try {
        const { login } = req.user;

        const lessons = await Lesson.findAll({
            include: [{
                model: Statement,
                where: { teacherLogin: login },
                attributes: []
            }],
            attributes: ["id", "statementId", "date"],
            order: [['date', 'ASC']]
        });

        res.json(lessons);
    } catch (error) {
        console.error("Ошибка при получении занятий преподавателя:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};