import { Group, Semester, Discipline, Journal  } from "../models/index.js";

export const findOrCreateSemester = async ({ groupId, disciplineId, semester, hours = 0, creditUnits = 0 }) => {
    console.log(`[findOrCreateSemester] Начало работы. Параметры:`, {
        groupId,
        disciplineId,
        semester,
        hours,
        creditUnits
    });

    try {
        // Проверка существования группы и дисциплины
        console.log(`[findOrCreateSemester] Поиск группы ${groupId} и дисциплины ${disciplineId}...`);
        const [group, discipline] = await Promise.all([
            Group.findByPk(groupId),
            Discipline.findByPk(disciplineId)
        ]);

        if (!group) {
            console.error(`[findOrCreateSemester] Группа ${groupId} не найдена`);
            throw new Error("Группа не найдена");
        }
        if (!discipline) {
            console.error(`[findOrCreateSemester] Дисциплина ${disciplineId} не найдена`);
            throw new Error("Дисциплина не найдена");
        }

        console.log(`[findOrCreateSemester] Поиск существующего семестра для groupId=${groupId}, disciplineId=${disciplineId}, semester=${semester}`);
        // Сначала ищем семестр строго по комбинации groupId + disciplineId + semester
        let existingSemester = await Semester.findOne({
            where: {
                groupId,
                disciplineId,
                semester
            }
        });

        if (existingSemester) {
            console.log(`[findOrCreateSemester] Найден существующий семестр:`, {
                id: existingSemester.id,
                groupId: existingSemester.groupId,
                disciplineId: existingSemester.disciplineId,
                semester: existingSemester.semester
            });
            return existingSemester;
        }

        console.log(`[findOrCreateSemester] Существующий семестр не найден, создаем новый...`);
        // Если не нашли, генерируем baseSemesterId
        const groupNumber = group.id.toString().padStart(4, '0');
        const semesterNumber = semester.toString().padStart(2, '0');
        const baseSemesterId = parseInt(`${groupNumber}${semesterNumber}`);
        
        console.log(`[findOrCreateSemester] Сгенерирован baseSemesterId: ${baseSemesterId} (groupNumber: ${groupNumber}, semesterNumber: ${semesterNumber})`);

        try {
            console.log(`[findOrCreateSemester] Попытка создания семестра с ID ${baseSemesterId}...`);
            existingSemester = await Semester.create({
                id: baseSemesterId,
                groupId,
                disciplineId,
                semester,
                hours,
                creditUnits
            });
            console.log(`[findOrCreateSemester] Успешно создан семестр с ID ${baseSemesterId}`);
            return existingSemester;
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.warn(`[findOrCreateSemester] Ошибка уникальности для ID ${baseSemesterId}, пробуем создать с максимальным ID + 1`);
                
                const maxId = await Semester.max('id');
                const newId = maxId + 1;
                console.log(`[findOrCreateSemester] Максимальный ID в таблице: ${maxId}, новый ID: ${newId}`);
                
                try {
                    existingSemester = await Semester.create({
                        id: newId,
                        groupId,
                        disciplineId,
                        semester,
                        hours,
                        creditUnits
                    });
                    console.log(`[findOrCreateSemester] Успешно создан семестр с новым ID ${newId}`);
                    return existingSemester;
                } catch (fallbackError) {
                    console.error(`[findOrCreateSemester] Ошибка при создании семестра с новым ID ${newId}:`, fallbackError);
                    throw new Error(`Не удалось создать семестр даже с новым ID: ${fallbackError.message}`);
                }
            } else {
                console.error(`[findOrCreateSemester] Неожиданная ошибка при создании семестра:`, error);
                throw error;
            }
        }
    } catch (error) {
        console.error(`[findOrCreateSemester] Критическая ошибка:`, error);
        throw error;
    }
};
export const getAllSemesters = async (req, res) => {
    try {
        // Получаем все семестры из базы данных
        const semesters = await Semester.findAll({
            attributes: [
                'id',
                'groupId',
                'disciplineId',
                'semester',
                'hours',
                'creditUnits'
            ],
            order: [
                ['semester', 'ASC'] // Сортировка по номеру семестра по возрастанию
            ]
        });
        console.log("семестры: ", semesters)
        // Если семестры не найдены
        if (!semesters || semesters.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Семестры не найдены'
            });
        }

        // Возвращаем успешный ответ с данными
        res.status(200).json({
            success: true,
            data: semesters
        });

    } catch (error) {
        console.error('Ошибка при получении списка семестров:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при получении списка семестров',
            error: error.message
        });
    }
};
// В controllers/semesterController.js
export const getExactSemester = async (req, res) => {
    try {
        const { groupId, disciplineId, semester } = req.params;

        console.log(`[getExactSemester] Поиск семестра для groupId=${groupId}, disciplineId=${disciplineId}, semester=${semester}`);

        // Ищем семестр с включением данных журнала (без поля createdAt)
        const semesterData = await Semester.findOne({
            where: {
                groupId,
                disciplineId,
                semester
            },
            include: [{
                model: Journal,
                as: 'journal',
                attributes: ['id', 'teacherLogin'] // Убрали createdAt
            }],
            attributes: ['id', 'groupId', 'disciplineId', 'semester', 'hours', 'creditUnits']
        });

        if (!semesterData) {
            console.log('[getExactSemester] Семестр не найден');
            return res.status(200).json(null);
        }

        // Форматируем результат
        const result = {
            id: semesterData.id,
            groupId: semesterData.groupId,
            disciplineId: semesterData.disciplineId,
            semester: semesterData.semester,
            hours: semesterData.hours,
            creditUnits: semesterData.creditUnits,
            journal: semesterData.journal ? {
                id: semesterData.journal.id,
                teacherLogin: semesterData.journal.teacherLogin
            } : null
        };

        console.log('[getExactSemester] Найден семестр:', result);
        res.status(200).json(result);

    } catch (error) {
        console.error('[getExactSemester] Ошибка:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
};

/**
 * Обновляет данные семестра
 * @param {number} semesterId - ID семестра для обновления
 * @param {Object} updateData - Данные для обновления
 * @param {Object} [transaction] - Опциональная транзакция
 * @returns {Promise<Semester>} Обновленный семестр
 */
export const updateSemester = async (semesterId, updateData, transaction = null) => {
    console.log(`[updateSemester] Начало работы. ID семестра: ${semesterId}, данные:`, updateData);

    const options = transaction ? { transaction } : {};
    
    try {
        // Проверяем существование семестра
        const semester = await Semester.findByPk(semesterId, options);
        if (!semester) {
            console.error(`[updateSemester] Семестр с ID ${semesterId} не найден`);
            throw new Error("Семестр не найден");
        }

        // Проверяем, есть ли что обновлять
        if (!updateData || Object.keys(updateData).length === 0) {
            console.warn(`[updateSemester] Нет данных для обновления`);
            return semester;
        }

        // Разрешенные поля для обновления
        const allowedFields = ['groupId', 'disciplineId', 'semester', 'hours', 'creditUnits'];
        const filteredData = {};

        // Фильтруем данные, оставляя только разрешенные поля
        for (const key in updateData) {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        }

        // Если после фильтрации не осталось полей для обновления
        if (Object.keys(filteredData).length === 0) {
            console.warn(`[updateSemester] Нет допустимых полей для обновления`);
            return semester;
        }

        console.log(`[updateSemester] Обновление семестра ID ${semesterId} данными:`, filteredData);
        await semester.update(filteredData, options);

        console.log(`[updateSemester] Семестр успешно обновлен`);
        return semester;
    } catch (error) {
        console.error(`[updateSemester] Ошибка при обновлении семестра:`, error);
        throw error;
    }
};