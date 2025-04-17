import { Faculty, Statement, Group, Specialty, Semester, Journal, Lesson, Discipline, User } from "../models/index.js";
import { findOrCreateSemester, updateSemester } from './semesterController.js';
import { findOrCreateJournal, updateJournal   } from './journalController.js';
import { sequelize } from "../models/index.js";
import { Op } from "sequelize";
import { Grade, Student } from "../models/index.js";

/**
 * Изменение ведомости с использованием updateSemester и updateJournal
 */
export const updateStatement = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { 
            teacherLogin, 
            classTeacherLogin,
            groupId,
            disciplineId,
            semester,
            assessmentType,
            date, 
            list,
            practiceHours,
            creditUnits,
            semesterId
        } = req.body;

        // Получаем ведомость с текущим семестром
        const statement = await Statement.findByPk(id, {
            include: [{
                model: Semester,
                as: 'semester',
                include: [{
                    model: Group,
                    as: 'group',
                    include: [{
                        model: Specialty,
                        as: 'specialty',
                        include: [{
                            model: Faculty,
                            as: 'faculty'
                        }]
                    }]
                }]
            }],
            transaction
        });
        
        if (!statement) {
            await transaction.rollback();
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        let targetSemesterId = semesterId || statement.semesterId;
        let updatedSemester = null;

        // 1. ОБНОВЛЕНИЕ СЕМЕСТРА (если есть данные для обновления)
        if (groupId || disciplineId || semester || practiceHours || creditUnits) {
            const currentSemester = await Semester.findByPk(targetSemesterId, { transaction });
            
            if (!currentSemester) {
                await transaction.rollback();
                return res.status(404).json({ error: "Семестр не найден" });
            }

            const semesterUpdateData = {
                groupId: groupId || currentSemester.groupId,
                disciplineId: disciplineId || currentSemester.disciplineId,
                semester: semester || currentSemester.semester,
                hours: practiceHours || currentSemester.hours,
                creditUnits: creditUnits || currentSemester.creditUnits
            };

            const hasChanges = Object.keys(semesterUpdateData).some(key => 
                currentSemester[key] !== semesterUpdateData[key]
            );

            if (hasChanges) {
                try {
                    updatedSemester = await updateSemester(
                        targetSemesterId, 
                        semesterUpdateData,
                        transaction
                    );
                    targetSemesterId = updatedSemester.id;
                } catch (error) {
                    await transaction.rollback();
                    console.error("Ошибка при обновлении семестра:", error);
                    return res.status(400).json({ 
                        error: "Ошибка при обновлении семестра",
                        details: error.message
                    });
                }
            }
        }

        // 2. ОБНОВЛЕНИЕ ЖУРНАЛА (если указан classTeacherLogin)
        if (classTeacherLogin !== undefined) {
            try {
                // Находим существующий журнал
                const existingJournal = await Journal.findOne({
                    where: { semesterId: targetSemesterId },
                    transaction
                });

                if (existingJournal) {
                    // Если журнал существует и teacherLogin изменился
                    if (existingJournal.teacherLogin !== classTeacherLogin) {
                        await updateJournal(
                            existingJournal.id,
                            { teacherLogin: classTeacherLogin },
                            transaction
                        );
                    }
                } else if (classTeacherLogin) {
                    // Если журнала нет, но classTeacherLogin указан - создаем
                    await findOrCreateJournal({
                        teacherLogin: classTeacherLogin,
                        semesterId: targetSemesterId
                    }, { transaction });
                } else {
                    // Если classTeacherLogin не указан и журнал существует - удаляем
                    await Journal.destroy({
                        where: { semesterId: targetSemesterId },
                        transaction
                    });
                }
            } catch (error) {
                await transaction.rollback();
                console.error("Ошибка при обновлении журнала:", error);
                return res.status(400).json({ 
                    error: "Ошибка при обновлении журнала",
                    details: error.message
                });
            }
        }

        // 3. ОБНОВЛЕНИЕ ВЕДОМОСТИ
        const updateData = {
            teacherLogin: teacherLogin !== undefined ? teacherLogin : statement.teacherLogin,
            semesterId: targetSemesterId,
            assessmentType: assessmentType !== undefined ? assessmentType : statement.assessmentType,
            date: date !== undefined ? new Date(date) : statement.date,
            list: list !== undefined ? (list === "[]" ? null : list) : statement.list
        };

        await statement.update(updateData, { transaction });

        // Получаем обновленные данные для ответа
        const finalSemester = updatedSemester || await Semester.findByPk(targetSemesterId, {
            include: [{
                model: Group,
                as: 'group',
                include: [{
                    model: Specialty,
                    as: 'specialty',
                    include: [{
                        model: Faculty,
                        as: 'faculty'
                    }]
                }]
            }],
            transaction
        });

        if (!finalSemester) {
            await transaction.rollback();
            return res.status(404).json({ error: "Семестр не найден после обновления" });
        }

        // Получаем текущий журнал (если есть)
        const currentJournal = await Journal.findOne({
            where: { semesterId: targetSemesterId },
            transaction
        });

        await transaction.commit();

        // Формируем ответ
        const response = {
            ...statement.toJSON(),
            disciplineId: finalSemester.disciplineId,
            groupId: finalSemester.groupId,
            practiceHours: finalSemester.hours,
            semester: finalSemester.semester,
            creditUnits: finalSemester.creditUnits,
            classTeacherLogin: currentJournal ? currentJournal.teacherLogin : null
        };

        res.json(response);
    } catch (error) {
        await transaction.rollback();
        console.error("Ошибка при изменении ведомости:", error);
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const createStatement = async (req, res) => {
    try {
        const { 
            teacherLogin, 
            classTeacherLogin,
            groupId,
            disciplineId,
            semester,
            assessmentType,
            date, 
            list,
            practiceHours,
            creditUnits,
            semesterId
        } = req.body;

        console.log("Полученные данные для создания ведомости:", {
            teacherLogin,
            groupId,
            disciplineId,
            semester,
            assessmentType,
            date,
            semesterId,
            practiceHours,
            creditUnits,
            classTeacherLogin
        });

        // Проверка обязательных полей (без date)
        const requiredFields = ["teacherLogin", "groupId", "disciplineId", "semester", "assessmentType"];
        const missingFields = requiredFields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            console.error("Отсутствуют обязательные поля:", missingFields);
            return res.status(400).json({ 
                error: "Все обязательные поля должны быть заполнены",
                missingFields,
                receivedValues: req.body
            });
        }

        // Обработка даты (необязательное поле)
        let dateObj = null;
        if (date) {
            dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                console.error("Некорректная дата:", date);
                return res.status(400).json({ 
                    error: "Некорректная дата",
                    receivedDate: date
                });
            }
        }

        let targetSemesterId = semesterId;
        console.log(`Проверка semesterId: ${targetSemesterId}, тип: ${typeof targetSemesterId}`);

        // Если не передан ID семестра, создаем/находим семестр
        if (!targetSemesterId || targetSemesterId === 'null' || targetSemesterId === 'undefined') {
            try {
                console.log(`Вызов findOrCreateSemester с параметрами:`, {
                    groupId,
                    disciplineId,
                    semester,
                    hours: practiceHours,
                    creditUnits
                });
                
                const semesterRecord = await findOrCreateSemester({
                    groupId,
                    disciplineId,
                    semester,
                    hours: practiceHours,
                    creditUnits
                });
                
                if (!semesterRecord) {
                    console.error("Функция findOrCreateSemester вернула null/undefined");
                    throw new Error("Не удалось создать или найти семестр");
                }
                
                targetSemesterId = semesterRecord.id;
                console.log(`Семестр найден/создан с ID: ${targetSemesterId}`);
            } catch (error) {
                console.error("Ошибка в findOrCreateSemester:", {
                    error: error.message,
                    stack: error.stack
                });
                return res.status(400).json({ 
                    error: `Ошибка при работе с семестром: ${error.message}`,
                    details: {
                        groupId,
                        disciplineId,
                        semester,
                        practiceHours,
                        creditUnits
                    }
                });
            }
        } else {
            console.log(`Используется существующий semesterId: ${targetSemesterId}`);
        }

        // Проверяем, что targetSemesterId установлен
        if (!targetSemesterId) {
            console.error("Не удалось определить ID семестра после всех попыток");
            return res.status(400).json({ 
                error: "Не удалось определить ID семестра",
                details: {
                    originalSemesterId: semesterId,
                    createdSemesterId: targetSemesterId
                }
            });
        }

        // Если передан classTeacherLogin, создаем/находим журнал
        if (classTeacherLogin) {
            try {
                console.log(`Попытка создания/поиска журнала для преподавателя: ${classTeacherLogin}, semesterId: ${targetSemesterId}`);
                await findOrCreateJournal({
                    teacherLogin: classTeacherLogin,
                    semesterId: targetSemesterId
                });
            } catch (error) {
                console.error("Ошибка при создании журнала для классного руководителя:", error);
                // Продолжаем выполнение, так как журнал не критичен для создания ведомости
            }
        }

        // Получаем полную информацию о семестре
        const semesterRecord = await Semester.findByPk(targetSemesterId, {
            include: [{
                model: Group,
                as: 'group',
                include: [{
                    model: Specialty,
                    as: 'specialty',
                    include: [{
                        model: Faculty,
                        as: 'faculty'
                    }]
                }]
            }]
        });

        if (!semesterRecord) {
            console.error("Семестр не найден после создания:", targetSemesterId);
            return res.status(404).json({ 
                error: "Семестр не найден",
                semesterId: targetSemesterId
            });
        }

        // Проверяем соответствие дисциплины
        if (semesterRecord.disciplineId.toString() !== disciplineId.toString()) {
            console.error("Несоответствие дисциплины:", {
                expected: disciplineId,
                actual: semesterRecord.disciplineId
            });
            return res.status(400).json({
                error: "Несоответствие дисциплины",
                expectedDisciplineId: disciplineId,
                actualDisciplineId: semesterRecord.disciplineId,
                semesterId: targetSemesterId
            });
        }

        // Проверяем, что все связанные модели загружены
        if (!semesterRecord.group || !semesterRecord.group.specialty || !semesterRecord.group.specialty.faculty) {
            console.error("Не удалось загрузить связанные данные:", {
                group: !!semesterRecord.group,
                specialty: !!semesterRecord.group?.specialty,
                faculty: !!semesterRecord.group?.specialty?.faculty
            });
            return res.status(500).json({ 
                error: "Не удалось загрузить связанные данные",
                missing: {
                    group: !semesterRecord.group,
                    specialty: !semesterRecord.group?.specialty,
                    faculty: !semesterRecord.group?.specialty?.faculty
                }
            });
        }

        // Генерация ID ведомости
        const facultyId = semesterRecord.group.specialty.faculty.id;
        const facultyIdStr = facultyId.toString().padStart(3, '0');

        const maxIdStatement = await Statement.findOne({
            where: {
                id: {
                    [Op.between]: [facultyId * 1000000, (facultyId + 1) * 1000000 - 1]
                }
            },
            order: [['id', 'DESC']],
            attributes: ['id']
        });

        let newStatementId;
        if (maxIdStatement) {
            const lastId = maxIdStatement.id.toString();
            const lastNumber = parseInt(lastId.slice(3), 10);
            newStatementId = parseInt(`${facultyIdStr}${(lastNumber + 1).toString().padStart(6, '0')}`, 10);
        } else {
            newStatementId = parseInt(`${facultyIdStr}000001`, 10);
        }

        // Создание ведомости
        const newStatement = await Statement.create({
            id: newStatementId,
            teacherLogin,
            semesterId: targetSemesterId,
            assessmentType,
            date: dateObj, // может быть null
            list: list || null,
        });

        // Формирование ответа
        const response = {
            ...newStatement.toJSON(),
            disciplineId: semesterRecord.disciplineId,
            groupId: semesterRecord.groupId,
            practiceHours: semesterRecord.hours,
            semester: semesterRecord.semester,
            creditUnits: semesterRecord.creditUnits
        };

        console.log("Ведомость успешно создана:", response);
        res.status(201).json(response);
    } catch (error) {
        console.error("Критическая ошибка:", {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};











/**
 * Получение ведомостей преподавателя
 */
export const getTeacherStatements = async (req, res) => {
    try {
        const { login } = req.user;

        const statements = await Statement.findAll({
            where: { teacherLogin: login },
            include: [{
                model: Semester,
                attributes: ['disciplineId', 'groupId', 'semester', 'hours', 'creditUnits'],
                required: true
            }],
            attributes: [
                "id",
                "teacherLogin",
                "assessmentType",
                "date",
                "list"
            ],
            order: [['date', 'DESC']]
        });

        // Формируем ответ в том же формате, что и раньше
        const formattedStatements = statements.map(statement => ({
            id: statement.id,
            teacherLogin: statement.teacherLogin,
            disciplineId: statement.Semester.disciplineId,
            groupId: statement.Semester.groupId,
            practiceHours: statement.Semester.hours,
            semester: statement.Semester.semester,
            assessmentType: statement.assessmentType,
            creditUnits: statement.Semester.creditUnits,
            date: statement.date,
            list: statement.list
        }));

        res.json(formattedStatements);
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
            include: [{
                model: Semester,
                attributes: ['creditUnits'],
                required: true
            }],
            attributes: ["id", "date"]
        });

        return !!statements;
    } catch (error) {
        console.error("Ошибка при проверке ведомостей преподавателя:", error);
        throw error;
    }
};

/**
 * Удаление ведомости
 */
export const deleteStatement = async (req, res) => {
    try {
        const { id } = req.params;

        const statement = await Statement.findByPk(id, {
            include: [{
                model: Semester,
                attributes: ['creditUnits'],
                required: true
            }]
        });
        
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        await statement.destroy();

        res.json({ 
            message: "Ведомость успешно удалена",
            deletedStatement: {
                id: statement.id,
                date: statement.date,
                teacherLogin: statement.teacherLogin,
                creditUnits: statement.Semester.creditUnits
            }
        });
    } catch (error) {
        console.error("Ошибка при удалении ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Получение всех ведомостей с связанными данными
 */
export const getAllStatements = async (req, res) => {
    try {
        const statements = await Statement.findAll({
            include: [
                {
                    model: Semester,
                    as: 'semester', // Add this line
                    attributes: ['disciplineId', 'groupId', 'semester', 'hours', 'creditUnits'],
                    required: true,
                    include: [{
                        model: Discipline,
                        attributes: ['name'],
                        as: 'discipline',
                        required: true
                    }]
                },
                {
                    model: User,
                    attributes: ['lastName', 'firstName', 'patronymic'],
                    as: 'teacher',
                    required: true
                }
            ],
            attributes: [
                "id",
                "teacherLogin",
                "assessmentType",
                "date",
                "list"
            ],
            order: [['date', 'DESC']]
        });

        // Формируем ответ с дополнительными данными
        const formattedStatements = statements.map(statement => ({
            id: statement.id,
            teacherLogin: statement.teacherLogin,
            teacherName: `${statement.teacher.lastName} ${statement.teacher.firstName} ${statement.teacher.patronymic || ''}`.trim(),
            disciplineId: statement.semester.disciplineId, // Changed from Semester to semester
            disciplineName: statement.semester.discipline.name, // Changed from Semester to semester
            groupId: statement.semester.groupId, // Changed from Semester to semester
            practiceHours: statement.semester.hours, // Changed from Semester to semester
            semester: statement.semester.semester, // Changed from Semester to semester
            assessmentType: statement.assessmentType,
            creditUnits: statement.semester.creditUnits, // Changed from Semester to semester
            date: statement.date,
            list: statement.list
        }));

        res.json(formattedStatements);
    } catch (error) {
        console.error("Ошибка при получении всех ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Рассчитывает среднюю оценку для каждого студента по всем занятиям ведомости
 */
export const calculateAverageGrades = async (statementId) => {
    try {
        // 1. Находим ведомость и связанный семестр
        const statement = await Statement.findByPk(statementId, {
            include: [{
                model: Semester,
                as: 'semester',
                required: true
            }]
        });

        if (!statement || !statement.semester) {
            return {};
        }

        // 2. Находим журнал для этого семестра
        const journal = await Journal.findOne({
            where: { semesterId: statement.semester.id }
        });

        if (!journal) {
            return {};
        }

        // 3. Находим все занятия для этого журнала
        const lessons = await Lesson.findAll({
            where: { journalId: journal.id },
            attributes: ['id']
        });

        if (!lessons.length) {
            return {};
        }

        // Остальная логика остается без изменений...
        const lessonIds = lessons.map(lesson => lesson.id);

        // Получаем числовые оценки для этих занятий
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

        // Получаем всех студентов группы из семестра
        const students = await Student.findAll({
            where: { groupId: statement.semester.groupId },
            attributes: ['id']
        });

        // Рассчитываем среднее для каждого студента
        const averages = {};
        students.forEach(student => {
            const grades = studentGrades[student.id] || [];
            averages[student.id] = grades.length 
                ? (grades.reduce((a, b) => a + b, 0) / grades.length )
                : null;
        });

        return averages;
    } catch (error) {
        console.error('Ошибка при расчете средних оценок:', error);
        throw error;
    }
};

/**
 * Подсчитывает количество пропусков ("не явился") для каждого студента
 */
export const countMissedLessons = async (statementId) => {
    try {
        // 1. Находим ведомость и связанный семестр
        const statement = await Statement.findByPk(statementId, {
            include: [{
                model: Semester,
                as: 'semester',
                required: true
            }]
        });

        if (!statement || !statement.semester) {
            return {};
        }

        // 2. Находим журнал для этого семестра
        const journal = await Journal.findOne({
            where: { semesterId: statement.semester.id }
        });

        if (!journal) {
            return {};
        }

        // 3. Находим все занятия для этого журнала
        const lessons = await Lesson.findAll({
            where: { journalId: journal.id },
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
            attributes: ['studentId', [sequelize.fn('COUNT', sequelize.col('*')), 'missedCount']],
            group: ['studentId'],
            raw: true
        });

        // Преобразуем результат в удобный формат
        const missedCounts = {};
        missedGrades.forEach(grade => {
            missedCounts[grade.studentId] = grade.missedCount;
        });

        // Добавляем студентов с нулевыми пропусками
        const students = await Student.findAll({
            where: { groupId: statement.semester.groupId },
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
// export const getStatementsByTeacherAndGroup = async (req, res) => {
//     console.log('Начало выполнения getStatementsByTeacherAndGroup');
//     console.log('Параметры запроса:', req.params);
    
//     try {
//         const { teacherLogin, groupId } = req.params;
//         const today = new Date();
//         const startOfDay = new Date(today.setHours(0, 0, 0, 0));
//         const endOfDay = new Date(today.setHours(23, 59, 59, 999));

//         console.log('Диапазон дат для поиска:', {
//             start: startOfDay.toISOString(),
//             end: endOfDay.toISOString()
//         });

//         // Получаем ведомости за текущий день
//         console.log('Поиск ведомостей для teacherLogin:', teacherLogin, 'и groupId:', groupId);
//         const statements = await Statement.findAll({
//             where: { 
//                 teacherLogin,
//                 date: {
//                     [Op.between]: [startOfDay, endOfDay]
//                 },
//                 list: null
//             },
//             include: [{
//                 model: Semester,
//                 as: 'semester',
//                 where: { groupId },
//                 include: [{
//                     model: Group,
//                     as: 'group',
//                     attributes: ['id', 'admissionYear']
//                 }, {
//                     model: Discipline,
//                     as: 'discipline',
//                     attributes: ['id', 'name']
//                 }]
//             }],
//             logging: console.log // Включаем логирование SQL запросов
//         });

//         console.log('Найдено ведомостей:', statements.length);
//         console.log('Сырые данные ведомостей:', JSON.stringify(statements, null, 2));

//         // Фильтруем ведомости по валидности даты
//         const filteredStatements = statements.filter(statement => {
//             if (!statement.date) {
//                 console.warn(`Ведомость ${statement.id} не имеет даты`);
//                 return false;
//             }
            
//             const date = new Date(statement.date);
//             if (isNaN(date.getTime())) {
//                 console.warn(`Ведомость ${statement.id} имеет невалидную дату: ${statement.date}`);
//                 return false;
//             }
            
//             if (statement.list !== null) {
//                 console.warn(`Ведомость ${statement.id} уже имеет заполненный list: ${statement.list}`);
//                 return false;
//             }
            
//             return true;
//         });

//         console.log('Ведомости после фильтрации:', filteredStatements.length);

//         // Форматируем результат
//         const formattedStatements = filteredStatements.map(statement => {
//             try {
//                 if (!statement.semester) {
//                     throw new Error(`Ведомость ${statement.id} не имеет связанного семестра`);
//                 }
                
//                 const result = {
//                     id: statement.id,
//                     assessmentType: statement.assessmentType,
//                     date: statement.date,
//                     list: statement.list,
//                     semester: statement.semester.semester,
//                     discipline: {
//                         id: statement.semester.discipline?.id,
//                         name: statement.semester.discipline?.name
//                     },
//                     group: {
//                         id: statement.semester.group?.id,
//                         admissionYear: statement.semester.group?.admissionYear
//                     }
//                 };
                
//                 console.log('Форматированная ведомость:', JSON.stringify(result, null, 2));
//                 return result;
//             } catch (error) {
//                 console.error(`Ошибка при форматировании ведомости ${statement.id}:`, error);
//                 return null;
//             }
//         }).filter(Boolean);

//         console.log('Успешно отформатировано ведомостей:', formattedStatements.length);

//         // Сортируем по дате (новые сначала)
//         formattedStatements.sort((a, b) => {
//             try {
//                 return new Date(b.date) - new Date(a.date);
//             } catch (error) {
//                 console.error('Ошибка при сортировке дат:', error);
//                 return 0;
//             }
//         });

//         console.log('Итоговый список ведомостей:', JSON.stringify(formattedStatements, null, 2));
        
//         res.json(formattedStatements);
//     } catch (error) {
//         console.error('Критическая ошибка в getStatementsByTeacherAndGroup:', {
//             error: error.message,
//             stack: error.stack,
//             params: req.params,
//             timestamp: new Date().toISOString()
//         });
        
//         res.status(500).json({ 
//             error: 'Внутренняя ошибка сервера',
//             details: error.message,
//             timestamp: new Date().toISOString()
//         });
//     } finally {
//         console.log('Завершение выполнения getStatementsByTeacherAndGroup');
//     }
// };