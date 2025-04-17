import { Lesson, Journal } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Получение занятий по журналу
 */
export const getLessonsByJournal = async (req, res) => {
    try {
        const { journalId } = req.params;

        // Проверяем, что journalId предоставлен и является числом
        if (!journalId || isNaN(journalId)) {
            return res.status(400).json({ error: "Неверный ID журнала" });
        }

        const lessons = await Lesson.findAll({
            where: { 
                journalId: Number(journalId)
            },
            order: [['date', 'ASC']],
            attributes: ["id", "journalId", "date"]
        });

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
        const { journalId, date } = req.body;

        // Проверка обязательных полей
        if (!journalId || !date) {
            return res.status(400).json({ 
                success: false,
                error: "Необходимо указать ID журнала и дату",
                lesson: null
            });
        }

        const numericJournalId = Number(journalId);
        if (isNaN(numericJournalId)) {
            return res.status(400).json({ 
                success: false,
                error: "ID журнала должен быть числом",
                lesson: null
            });
        }

        // Проверка существования журнала
        const journal = await Journal.findByPk(numericJournalId);
        if (!journal) {
            return res.status(404).json({ 
                success: false,
                error: "Журнал не найден",
                lesson: null
            });
        }

        // Находим последнее занятие для этого журнала
        const lastLesson = await Lesson.findOne({
            where: { journalId: numericJournalId },
            order: [['id', 'DESC']],
        });

        // Генерация нового ID
        let sequenceNumber;
        if (lastLesson) {
            // Извлекаем последние 3 цифры из ID
            const lastSequence = parseInt(lastLesson.id.toString().slice(-3));
            sequenceNumber = lastSequence + 1;
        } else {
            sequenceNumber = 1; // Первое занятие для этого журнала
        }

        // Форматируем номер с ведущими нулями (3 цифры)
        const formattedSequence = String(sequenceNumber).padStart(3, '0');
        const newLessonId = Number(`${numericJournalId}${formattedSequence}`);

        // Проверка, что ID не превысит допустимые пределы
        if (sequenceNumber > 999) {
            return res.status(400).json({
                success: false,
                error: "Достигнут максимальный номер занятия для этого журнала (999)",
                lesson: null
            });
        }

        // Создаем занятие
        const newLesson = await Lesson.create({
            id: newLessonId,
            journalId: numericJournalId,
            date: new Date(date)
        });

        res.status(201).json({ 
            success: true,
            lesson: {
                id: newLesson.id,
                journalId: newLesson.journalId,
                date: newLesson.date.toISOString().split('T')[0]
            },
            error: null
        });

    } catch (error) {
        console.error("Ошибка при создании занятия:", error);
        res.status(500).json({ 
            success: false,
            error: "Внутренняя ошибка сервера",
            lesson: null
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
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message
        });
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
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message
        });
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
                model: Journal,
                where: { teacherLogin: login },
                attributes: []
            }],
            attributes: ["id", "journalId", "date"],
            order: [['date', 'ASC']]
        });

        res.json(lessons);
    } catch (error) {
        console.error("Ошибка при получении занятий преподавателя:", error);
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message
        });
    }
};