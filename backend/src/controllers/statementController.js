import { Statement, Group, Specialty } from "../models/index.js";
import { sequelize } from "../models/index.js";
import { Op } from "sequelize";
import { Lesson, Grade, Student } from "../models/index.js";
/**
 * Получение ведомостей преподавателя
 */
export const getTeacherStatements = async (req, res) => {
    try {
        const { login } = req.user;

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
                "date",
                "list"
            ],
            order: [['date', 'DESC']] // Сортировка по дате (новые сначала)
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
            attributes: ["id", "date"] // Включаем дату в результат
        });

        return !!statements;
    } catch (error) {
        console.error("Ошибка при проверке ведомостей преподавателя:", error);
        throw error;
    }
};

/**
 * Создание новой ведомости
 */
export const createStatement = async (req, res) => {
    try {
        const { teacherLogin, disciplineId, groupId, practiceHours, semester, assessmentType, date, list } = req.body;

        // Проверка обязательных полей
        if (!teacherLogin || !disciplineId || !groupId || !practiceHours || !semester || !assessmentType || !date) {
            return res.status(400).json({ 
                error: "Все обязательные поля должны быть заполнены",
                required: ["teacherLogin", "disciplineId", "groupId", "practiceHours", "semester", "assessmentType", "date"]
            });
        }

        // Проверка валидности даты
        if (isNaN(new Date(date).getTime())) {
            return res.status(400).json({ error: "Некорректная дата" });
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

        const facultyId = specialty.facultyId;
        const facultyIdStr = facultyId.toString().padStart(3, '0');

        // Поиск максимального ID
        const maxIdStatement = await Statement.findOne({
            where: {
                id: {
                    [Op.between]: [facultyId * 1000000, (facultyId + 1) * 1000000 - 1]
                }
            },
            order: [['id', 'DESC']],
            attributes: ['id']
        });

        // Генерация нового ID ведомости
        let newStatementId;
        if (maxIdStatement) {
            const lastId = maxIdStatement.id.toString();
            const lastNumber = parseInt(lastId.slice(3), 10);
            newStatementId = parseInt(`${facultyIdStr}${(lastNumber + 1).toString().padStart(6, '0')}`, 10);
        } else {
            newStatementId = parseInt(`${facultyIdStr}000001`, 10);
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
            date: new Date(date),
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
        const { id } = req.params;
        const { teacherLogin, disciplineId, groupId, practiceHours, semester, assessmentType, date, list } = req.body;

        const statement = await Statement.findByPk(id);
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        // Обновление данных
        statement.teacherLogin = teacherLogin || statement.teacherLogin;
        statement.disciplineId = disciplineId || statement.disciplineId;
        statement.groupId = groupId || statement.groupId;
        statement.practiceHours = practiceHours || statement.practiceHours;
        statement.semester = semester || statement.semester;
        statement.assessmentType = assessmentType || statement.assessmentType;
        statement.date = date ? new Date(date) : statement.date;
        statement.list = list || statement.list;

        await statement.save();

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
        const { id } = req.params;

        const statement = await Statement.findByPk(id);
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        await statement.destroy();

        res.json({ 
            message: "Ведомость успешно удалена",
            deletedStatement: {
                id: statement.id,
                date: statement.date,
                teacherLogin: statement.teacherLogin
            }
        });
    } catch (error) {
        console.error("Ошибка при удалении ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Получение всех ведомостей
 */
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
                "date",
                "list"
            ],
            order: [['date', 'DESC']] // Сортировка по дате (новые сначала)
        });

        res.json(statements);
    } catch (error) {
        console.error("Ошибка при получении всех ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};



/**
 * Рассчитывает среднюю оценку для каждого студента по всем занятиям ведомости
 * @param {number} statementId - ID ведомости
 * @returns {Promise<Object>} - Объект с studentId в качестве ключа и средней оценкой в качестве значения
 */
// В методе calculateAverageGrades в statementController.js
export const calculateAverageGrades = async (statementId) => {
    try {
        // Находим все занятия для данной ведомости
        const lessons = await Lesson.findAll({
            where: { statementId },
            attributes: ['id']
        });

        if (!lessons.length) {
            return {};
        }

        const lessonIds = lessons.map(lesson => lesson.id);

        // Получаем только числовые оценки от 0 до 10 для этих занятий
        const grades = await Grade.findAll({
            where: {
                lessonId: lessonIds,
                value: {
                    [Op.in]: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
                }
            },
            attributes: ['studentId', 'value']
        });

        // Группируем оценки по студентам
        const studentGrades = {};
        grades.forEach(grade => {
            const numericValue = parseInt(grade.value);
            if (!studentGrades[grade.studentId]) {
                studentGrades[grade.studentId] = [];
            }
            studentGrades[grade.studentId].push(numericValue);
        });

        // Получаем всех студентов ведомости
        const statement = await Statement.findByPk(statementId);
        const students = await Student.findAll({
            where: { groupId: statement.groupId },
            attributes: ['id']
        });

        // Рассчитываем среднее для каждого студента
        const averages = {};
        students.forEach(student => {
            const studentId = student.id;
            if (studentGrades[studentId] && studentGrades[studentId].length > 0) {
                // Если есть оценки, считаем среднее
                const sum = studentGrades[studentId].reduce((a, b) => a + b, 0);
                averages[studentId] = sum / studentGrades[studentId].length;
            } else {
                // Если оценок нет, возвращаем null (будет отображаться как '-')
                averages[studentId] = null;
            }
        });

        return averages;
    } catch (error) {
        console.error('Ошибка при расчете средних оценок:', error);
        throw error;
    }
};


/**
 * Подсчитывает количество пропусков ("не явился") для каждого студента по всем занятиям ведомости
 * @param {number} statementId - ID ведомости
 * @returns {Promise<Object>} - Объект с studentId в качестве ключа и количеством пропусков в качестве значения
 */
export const countMissedLessons = async (statementId) => {
    try {
        // Находим все занятия для данной ведомости
        const lessons = await Lesson.findAll({
            where: { statementId },
            attributes: ['id']
        });

        if (!lessons.length) {
            return {};
        }

        const lessonIds = lessons.map(lesson => lesson.id);

        // Получаем все оценки "не явился" для этих занятий
        const missedGrades = await Grade.findAll({
            where: {
                lessonId: lessonIds,
                value: 'не явился'
            },
            attributes: ['studentId', [sequelize.literal('COUNT(*)'), 'missedCount']],
            group: ['studentId'],
            raw: true
        });

        // Преобразуем результат в удобный формат
        const missedCounts = {};
        missedGrades.forEach(grade => {
            missedCounts[grade.studentId] = grade.missedCount;
        });

        // Добавляем студентов с нулевыми пропусками
        const statement = await Statement.findByPk(statementId);
        if (!statement) {
            return missedCounts;
        }

        const students = await Student.findAll({
            where: {
                groupId: statement.groupId
            },
            attributes: ['id'],
            raw: true
        });

        students.forEach(student => {
            if (!(student.id in missedCounts)) {
                missedCounts[student.id] = 0;
            }
        });

        return missedCounts;
    } catch (error) {
        console.error('Ошибка при подсчете пропусков:', error);
        throw error;
    }
};