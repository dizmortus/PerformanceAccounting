
import { Op } from "sequelize";
import { Group, Semester, Statement, Journal, Discipline } from "../models/index.js";

export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params; // Получаем ID группы из параметров запроса

        const group = await Group.findByPk(id, {
            attributes: [
                "id",
                "specialtyId",
                "admissionYear",
                "educationForm",
                "educationLevel"
            ]
        });

        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        res.json(group);
    } catch (error) {
        console.error("Ошибка при получении данных группы:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};
// Получение всех групп
export const getAllGroups = async (req, res) => {
    try {
        console.log("Запрос на получение списка групп");

        const groups = await Group.findAll({
            attributes: [
                "id",
                "specialtyId",
                "admissionYear",
                "educationForm",
                "educationLevel"
            ]
        });

        // Вывод всех групп в консоль
        console.log("Полученные группы:");
        groups.forEach((group, index) => {
            console.log(`Группа #${index + 1}:`, JSON.stringify(group, null, 2));
        });

        res.json(groups);
    } catch (error) {
        console.error("Ошибка при получении списка групп:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};


function calculateCurrentSemester(admissionYear) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    
    // 1. Вычисляем сколько учебных лет прошло (учебный год начинается в сентябре)
    let academicYearsPassed = currentYear - admissionYear;
    
    // 2. Корректируем для текущего месяца:
    // - Если сейчас январь-август, учебный год еще не закончился
    if (month >= 1 && month < 9) {
        academicYearsPassed -= 1;
    }
    
    // 3. Определяем текущий семестр:
    // - 1 семестр: сентябрь-январь (до 15 января)
    // - 2 семестр: с 16 января по июнь
    const isFirstSemester = (month >= 9) || (month === 1 && now.getDate() <= 15);
    const currentSemesterNumber = isFirstSemester ? 1 : 2;
    
    // 4. Общее количество семестров:
    const totalSemesters = (academicYearsPassed * 2) + currentSemesterNumber;
    
    console.log([
        `Год поступления: ${admissionYear}`,
        `Текущая дата: ${now.toISOString()}`,
        `Учебных лет прошло: ${academicYearsPassed}`,
        `Текущий семестр в году: ${currentSemesterNumber}`,
        `Всего семестров: ${totalSemesters}`
    ].join(' | '));
    
    return totalSemesters;
}

const filterJournalsByCurrentSemester = (journals) => {
    return journals.filter(journal => {
        const semester = journal.semester;
        const group = semester?.group;
        
        if (!semester || !group) return false;
        
        // Проверяем валидность даты
        if (journal.createdAt && isNaN(new Date(journal.createdAt).getTime())) {
            console.warn(`Найден журнал с невалидной датой: ${journal.id}`);
            return false;
        }

        // Проверяем соответствие текущему семестру
        const currentSemester = calculateCurrentSemester(group.admissionYear);
        return semester.semester === currentSemester;
    });
};

const filterStatementsByDate = (statements) => {
    return statements.filter(statement => {
        if (!statement.date) {
            console.warn(`Ведомость ${statement.id} не имеет даты`);
            return false;
        }
        
        const date = new Date(statement.date);
        if (isNaN(date.getTime())) {
            console.warn(`Ведомость ${statement.id} имеет невалидную дату: ${statement.date}`);
            return false;
        }
        
        if (statement.list !== null) {
            console.warn(`Ведомость ${statement.id} уже имеет заполненный list: ${statement.list}`);
            return false;
        }
        
        return true;
    });
};


export const getGroupsByTeacher = async (req, res) => {
    try {
        const { teacherLogin } = req.params;
        const today = new Date();
        
        // 1. Получаем журналы преподавателя
        const journals = await Journal.findAll({
            where: { teacherLogin },
            include: {
                model: Semester,
                as: 'semester',
                include: {
                    model: Group,
                    as: 'group',
                    attributes: ["id", "admissionYear"]
                }
            }
        });

        // 2. Фильтруем журналы по текущему семестру с использованием filterJournalsByCurrentSemester
        const journalGroupIds = filterJournalsByCurrentSemester(journals)
            .map(journal => journal.semester.group.id);

        // 3. Получаем ведомости преподавателя за сегодня (без заполненного list)
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const statements = await Statement.findAll({
            where: {
                teacherLogin,
                date: {
                    [Op.between]: [startOfDay, endOfDay]
                },
                list: null // Добавляем условие, что list должен быть null
            },
            include: {
                model: Semester,
                as: 'semester',
                include: {
                    model: Group,
                    as: 'group',
                    attributes: ["id"]
                }
            }
        });

        // 4. Получаем ID групп из ведомостей с использованием filterStatementsByDate
        const statementGroupIds = filterStatementsByDate(statements)
            .map(s => s.semester?.group?.id)
            .filter(Boolean);

        // 5. Объединяем и удаляем дубликаты
        const allGroupIds = [...new Set([...journalGroupIds, ...statementGroupIds])];

        res.json(allGroupIds); // Возвращаем массив ID групп

    } catch (error) {
        console.error("Ошибка при получении групп преподавателя:", error);
        res.status(500).json({ 
            error: error.message,
            details: "Ошибка сервера при получении списка групп"
        });
    }
};

export const getJournalsByTeacherAndGroup = async (req, res) => {
    try {
        const { teacherLogin, groupId } = req.params;

        // Получаем журналы с информацией о группе
        const journals = await Journal.findAll({
            where: { teacherLogin },
            include: [{
                model: Semester,
                as: 'semester',
                where: { groupId },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'admissionYear']
                }, {
                    model: Discipline,
                    as: 'discipline',
                    attributes: ['id', 'name']
                }]
            }]
        });

        // Фильтруем журналы по текущему семестру с использованием filterJournalsByCurrentSemester
        const filteredJournals = filterJournalsByCurrentSemester(journals);

        // Форматируем результат
        const formattedJournals = filteredJournals.map(journal => ({
            id: journal.id,
            semester: journal.semester.semester,
            createdAt: journal.createdAt,
            discipline: {
                id: journal.semester.discipline.id,
                name: journal.semester.discipline.name
            },
            group: {
                id: journal.semester.group.id,
                admissionYear: journal.semester.group.admissionYear
            }
        }));

        // Сортируем по семестру и дате создания
        formattedJournals.sort((a, b) => {
            if (a.semester !== b.semester) return a.semester - b.semester;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json(formattedJournals);
    } catch (error) {
        console.error('Ошибка при получении журналов:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Ошибка сервера при получении журналов'
        });
    }
};

export const getStatementsByTeacherAndGroup = async (req, res) => {
    try {
        const { teacherLogin, groupId } = req.params;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Получаем ведомости за текущий день
        const statements = await Statement.findAll({
            where: { 
                teacherLogin,
                date: {
                    [Op.between]: [startOfDay, endOfDay]
                },
                list: null
            },
            include: [{
                model: Semester,
                as: 'semester',
                where: { groupId },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'admissionYear']
                }, {
                    model: Discipline,
                    as: 'discipline',
                    attributes: ['id', 'name']
                }]
            }],
        });

        // Фильтруем ведомости по валидности даты с использованием filterStatementsByDate
        const filteredStatements = filterStatementsByDate(statements);

        // Форматируем результат
        const formattedStatements = filteredStatements.map(statement => ({
            id: statement.id,
            assessmentType: statement.assessmentType,
            date: statement.date,
            list: statement.list,
            semester: statement.semester.semester,
            discipline: {
                id: statement.semester.discipline?.id,
                name: statement.semester.discipline?.name
            },
            group: {
                id: statement.semester.group?.id,
                admissionYear: statement.semester.group?.admissionYear
            }
        }));

        // Сортируем по дате (новые сначала)
        formattedStatements.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(formattedStatements);
    } catch (error) {
        console.error('Критическая ошибка в getStatementsByTeacherAndGroup:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
export const getDisciplinesByTeacherAndGroup = async (req, res) => {
    try {
        const { teacherLogin, groupId } = req.params;

        // 1. Получаем журналы по преподавателю и группе
        const journals = await Journal.findAll({
            where: { teacherLogin },
            include: [{
                model: Semester,
                as: 'semester',
                where: { groupId },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'admissionYear']
                }, {
                    model: Discipline,
                    as: 'discipline',
                    attributes: ['id', 'name']
                }]
            }]
        });

        // 2. Фильтруем журналы по текущему семестру с использованием filterJournalsByCurrentSemester
        const filteredJournals = filterJournalsByCurrentSemester(journals);

        // 3. Получаем ведомости по преподавателю и группе
        const statements = await Statement.findAll({
            where: {
                teacherLogin,
                list: null // Условие, что список должен быть пустым
            },
            include: [{
                model: Semester,
                as: 'semester',
                where: { groupId },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'admissionYear']
                }, {
                    model: Discipline,
                    as: 'discipline',
                    attributes: ['id', 'name']
                }]
            }]
        });

        // 4. Фильтруем ведомости по валидности даты
        const filteredStatements = filterStatementsByDate(statements);

        // 5. Собираем все дисциплины из журналов и ведомостей
        const disciplines = new Set();

        // Добавляем дисциплины из журналов
        filteredJournals.forEach(journal => {
            if (journal.semester.discipline) {
                disciplines.add(journal.semester.discipline.name);
            }
        });

        // Добавляем дисциплины из ведомостей
        filteredStatements.forEach(statement => {
            if (statement.semester.discipline) {
                disciplines.add(statement.semester.discipline.name);
            }
        });

        // Конвертируем Set в массив
        const disciplineArray = Array.from(disciplines);

        // Возвращаем дисциплины
        res.json(disciplineArray);
    } catch (error) {
        console.error("Ошибка при получении дисциплин:", error);
        res.status(500).json({
            error: error.message,
            details: "Ошибка сервера при получении дисциплин"
        });
    }
};

/**
 * Получает текущий семестр для указанной группы
 * @param {Object} req - Объект запроса
 * @param {Object} res - Объект ответа
 */
export const getCurrentSemesterNumber = async (req, res) => {
    try {
        const { groupId } = req.params;

        // 1. Получаем только год поступления группы
        const group = await Group.findByPk(groupId, {
            attributes: ["admissionYear"],
            raw: true // Возвращаем простой объект без экземпляра модели
        });

        if (!group) {
            return res.status(404).json({ 
                error: "Группа не найдена" 
            });
        }

        // 2. Вычисляем текущий семестр
        const currentSemester = calculateCurrentSemester(group.admissionYear);

        // 3. Возвращаем только номер семестра
        res.json(currentSemester);

    } catch (error) {
        console.error("Ошибка при получении текущего семестра:", error);
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message
        });
    }
};

