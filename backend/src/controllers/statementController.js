import { Statement, Group, Specialty, Discipline } from "../models/index.js";
import { sequelize } from "../models/index.js";
import { Op } from "sequelize";
import { Lesson, Grade, Student } from "../models/index.js";

/**
 * Получение ведомостей преподавателя (как основного, так и преподавателя занятий)
 */
export const getTeacherStatements = async (req, res) => {
    try {
        const { login } = req.user;
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Получаем все ведомости преподавателя
        const statements = await Statement.findAll({
            where: {
                [Op.or]: [
                    { teacherLogin: login },
                    { classTeacherLogin: login }
                ]
            },
            include: [
                {
                    model: Group,
                    as: 'group',
                    attributes: ['admissionYear']
                },
                {
                    model: Discipline,
                    as: 'discipline',
                    attributes: ['name']
                }
            ],
            attributes: [
                "id", "teacherLogin", "classTeacherLogin", "disciplineId", 
                "groupId", "practiceHours", "semester", "assessmentType", 
                "creditUnits", "date", "list"
            ],
            order: [['date', 'DESC']]
        });

        // Функция расчета текущего семестра
        const calculateCurrentSemester = (admissionYear) => {
            const currentYear = now.getFullYear();
            const month = now.getMonth() + 1;
            let yearsPassed = currentYear - admissionYear;
            
            if (month >= 1 && month < 9) yearsPassed -= 1;
            
            const isFirstSemester = (month >= 9) || (month === 1 && now.getDate() <= 15);
            return (yearsPassed * 2) + (isFirstSemester ? 1 : 2);
        };

        // Обрабатываем ведомости с учетом двойной принадлежности
        const result = statements.map(statement => {
            const isMainTeacher = statement.teacherLogin === login;
            const isClassTeacher = statement.classTeacherLogin === login;
            const hasNoList = !statement.list || statement.list === '[]';
            const isExamType = ['зачет', 'экзамен', 'дифференцированный зачет'].includes(statement.assessmentType);
            const isPracticeType = ['практика', 'курсовой проект'].includes(statement.assessmentType);

            // Определяем типы ведомости
            const types = [];
            
            // Проверка для преподавателя занятий (learning)
            if (isClassTeacher && isExamType) {
                const currentSemester = calculateCurrentSemester(statement.group.admissionYear);
                if (currentSemester === statement.semester && hasNoList) {
                    types.push('learning');
                }
            }

            // Проверка для основного преподавателя (main)
            if (isMainTeacher) {
                if (isExamType && statement.date) {
                    const statementDate = new Date(statement.date);
                    const normalizedDate = new Date(
                        statementDate.getFullYear(),
                        statementDate.getMonth(),
                        statementDate.getDate()
                    );
                    
                    if (normalizedDate.getTime() === currentDate.getTime() && hasNoList) {
                        types.push('main');
                    }
                } 
                else if (isPracticeType) {
                    const currentSemester = calculateCurrentSemester(statement.group.admissionYear);
                    if (currentSemester === statement.semester && hasNoList) {
                        types.push('main');
                    }
                }
            }

            // Возвращаем ведомость с информацией о типах
            return {
                ...statement.get({ plain: true }),
                disciplineName: statement.discipline?.name,
                statementTypes: types, // Может содержать оба типа
                isValid: types.length > 0 // Флаг валидности
            };
        }).filter(statement => statement.isValid); // Фильтруем только валидные ведомости

        // Логируем результат
        console.log('Обработанные ведомости:', result.map(s => ({
            id: s.id,
            types: s.statementTypes,
            discipline: s.disciplineName,
            semester: s.semester,
            assessmentType: s.assessmentType
        })));

        res.json(result);
    } catch (error) {
        console.error("Ошибка при получении ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Проверка наличия ведомостей у преподавателя (как основного, так и преподавателя занятий)
 */
export const hasTeacherStatements = async (teacherLogin) => {
    try {
        const statements = await Statement.findOne({
            where: {
                [Op.or]: [
                    { teacherLogin },
                    { classTeacherLogin: teacherLogin }
                ]
            },
            attributes: ["id", "date", "creditUnits"]
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
        const { 
            teacherLogin, 
            classTeacherLogin,
            disciplineId, 
            groupId, 
            practiceHours, 
            semester, 
            assessmentType, 
            creditUnits,
            date, 
            list 
        } = req.body;

        console.log("Получен запрос на создание ведомости:", req.body);

        // Проверка обязательных полей (без date)
        if (
            !teacherLogin || 
            !disciplineId || 
            !groupId || 
            !practiceHours || 
            !semester || 
            !assessmentType || 
            creditUnits === undefined || 
            creditUnits === null
        ) {
            console.warn("Некорректные или отсутствующие обязательные поля");
            return res.status(400).json({ 
                error: "Все обязательные поля должны быть заполнены",
                required: [
                    "teacherLogin", 
                    "disciplineId", 
                    "groupId", 
                    "practiceHours", 
                    "semester", 
                    "assessmentType",
                    "creditUnits"
                ]
            });
        }

        // Проверка валидности даты (если передана)
        if (date && isNaN(new Date(date).getTime())) {
            console.warn("Некорректная дата:", date);
            return res.status(400).json({ error: "Некорректная дата" });
        }

        // Проверка зачетных единиц
        if (creditUnits < 0) {
            console.warn("Отрицательное количество зачетных единиц:", creditUnits);
            return res.status(400).json({ error: "Количество зачетных единиц не может быть отрицательным" });
        }

        // Получение ID специальности и факультета
        const group = await Group.findByPk(groupId);
        if (!group) {
            console.warn("Группа не найдена:", groupId);
            return res.status(404).json({ error: "Группа не найдена" });
        }

        const specialty = await Specialty.findByPk(group.specialtyId);
        if (!specialty) {
            console.warn("Специальность не найдена:", group.specialtyId);
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
            classTeacherLogin: classTeacherLogin || null,
            disciplineId,
            groupId,
            practiceHours,
            semester,
            assessmentType,
            creditUnits,
            date: date ? new Date(date) : null,
            list: list || null,
        });

        console.log("Ведомость успешно создана:", newStatement.id);
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
        const { 
            teacherLogin, 
            classTeacherLogin,
            disciplineId, 
            groupId, 
            practiceHours, 
            semester, 
            assessmentType, 
            creditUnits,
            date, 
            list 
        } = req.body;

        const statement = await Statement.findByPk(id);
        if (!statement) {
            return res.status(404).json({ error: "Ведомость не найдена" });
        }

        // Проверка зачетных единиц
        if (creditUnits !== undefined && creditUnits < 0) {
            return res.status(400).json({ error: "Количество зачетных единиц не может быть отрицательным" });
        }

        // Обновление данных
        statement.teacherLogin = teacherLogin !== undefined ? teacherLogin : statement.teacherLogin;
        statement.classTeacherLogin = classTeacherLogin !== undefined ? classTeacherLogin : statement.classTeacherLogin;
        statement.disciplineId = disciplineId !== undefined ? disciplineId : statement.disciplineId;
        statement.groupId = groupId !== undefined ? groupId : statement.groupId;
        statement.practiceHours = practiceHours !== undefined ? practiceHours : statement.practiceHours;
        statement.semester = semester !== undefined ? semester : statement.semester;
        statement.assessmentType = assessmentType !== undefined ? assessmentType : statement.assessmentType;
        statement.creditUnits = creditUnits !== undefined ? creditUnits : statement.creditUnits;
        statement.date = date !== undefined ? new Date(date) : statement.date;
        if (list !== undefined) {
            statement.list = list === "[]" ? null : list;
        }

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
                teacherLogin: statement.teacherLogin,
                classTeacherLogin: statement.classTeacherLogin,
                creditUnits: statement.creditUnits
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
                "classTeacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester",
                "assessmentType",
                "creditUnits",
                "date",
                "list"
            ],
            order: [['date', 'DESC']]
        });

        res.json(statements);
    } catch (error) {
        console.error("Ошибка при получении всех ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Находит связанную ведомость для курсового проекта
 * @param {number} statementId - ID ведомости курсового проекта
 * @returns {Promise<Statement|null>} - Найденная связанная ведомость или null
 */
const findRelatedStatement = async (statementId) => {
    const currentStatement = await Statement.findByPk(statementId);
    if (!currentStatement || currentStatement.assessmentType !== 'курсовой проект') {
        return null;
    }

    return await Statement.findOne({
        where: {
            groupId: currentStatement.groupId,
            semester: currentStatement.semester,
            disciplineId: currentStatement.disciplineId,
            assessmentType: {
                [Op.ne]: 'курсовой проект'
            }
        }
    });
};

/**
 * Рассчитывает среднюю оценку для каждого студента
 * @param {number} statementId - ID ведомости
 * @returns {Promise<Object>} - Объект с studentId в качестве ключа и средней оценкой в качестве значения
 */
export const calculateAverageGrades = async (statementId) => {
    try {
        // Проверяем, является ли ведомость курсовым проектом
        const relatedStatement = await findRelatedStatement(statementId);
        const targetStatementId = relatedStatement ? relatedStatement.id : statementId;

        // Находим все занятия для целевой ведомости
        const lessons = await Lesson.findAll({
            where: { statementId: targetStatementId },
            attributes: ['id']
        });

        if (!lessons.length) {
            return {};
        }

        const lessonIds = lessons.map(lesson => lesson.id);

        // Получаем числовые оценки
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

        // Получаем студентов исходной ведомости
        const originalStatement = await Statement.findByPk(statementId);
        const students = await Student.findAll({
            where: { groupId: originalStatement.groupId },
            attributes: ['id']
        });

        // Рассчитываем среднее
        const averages = {};
        students.forEach(student => {
            const studentId = student.id;
            if (studentGrades[studentId]?.length > 0) {
                const sum = studentGrades[studentId].reduce((a, b) => a + b, 0);
                averages[studentId] = sum / studentGrades[studentId].length;
            } else {
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
 * Подсчитывает количество пропусков для каждого студента
 * @param {number} statementId - ID ведомости
 * @returns {Promise<Object>} - Объект с studentId в качестве ключа и количеством пропусков
 */
export const countMissedLessons = async (statementId) => {
    try {
        // Проверяем, является ли ведомость курсовым проектом
        const relatedStatement = await findRelatedStatement(statementId);
        const targetStatementId = relatedStatement ? relatedStatement.id : statementId;

        // Находим занятия для целевой ведомости
        const lessons = await Lesson.findAll({
            where: { statementId: targetStatementId },
            attributes: ['id']
        });

        if (!lessons.length) {
            return {};
        }

        const lessonIds = lessons.map(lesson => lesson.id);

        // Считаем пропуски
        const missedGrades = await Grade.findAll({
            where: {
                lessonId: lessonIds,
                value: 'не явился'
            },
            attributes: ['studentId', [sequelize.literal('COUNT(*)'), 'missedCount']],
            group: ['studentId'],
            raw: true
        });

        // Форматируем результат
        const missedCounts = {};
        missedGrades.forEach(grade => {
            missedCounts[grade.studentId] = grade.missedCount;
        });

        // Добавляем студентов с нулевыми пропусками
        const originalStatement = await Statement.findByPk(statementId);
        const students = await Student.findAll({
            where: { groupId: originalStatement.groupId },
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

/**
 * Поиск ведомости по группе, дисциплине и семестру
 * @param {number} groupId - ID группы
 * @param {number} disciplineId - ID дисциплины
 * @param {number} semester - Номер семестра
 * @returns {Promise<Statement|null>} - Найденная ведомость или null
 */
export const findStatementByGroupDisciplineSemester = async (groupId, disciplineId, semester) => {
    try {
        const statement = await Statement.findOne({
            where: {
                groupId,
                disciplineId,
                semester
            },
            attributes: [
                "id",
                "teacherLogin",
                "classTeacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester",
                "assessmentType",
                "creditUnits",
                "date",
                "list"
            ]
        });

        return statement;
    } catch (error) {
        console.error("Ошибка при поиске ведомости:", error);
        throw error;
    }
};

/**
 * Получение ведомости по группе, дисциплине и семестру (API endpoint)
 */
export const getStatementByGroupDisciplineSemester = async (req, res) => {
    try {
        const { groupId, disciplineId, semester } = req.params;

        if (!groupId || !disciplineId || !semester) {
            return res.status(400).json({ 
                error: "Необходимо указать groupId, disciplineId и semester" 
            });
        }

        const statement = await findStatementByGroupDisciplineSemester(
            parseInt(groupId),
            parseInt(disciplineId),
            parseInt(semester)
        );

        if (!statement) {
            return res.status(404).json({ 
                error: "Ведомость не найдена" 
            });
        }

        res.json(statement);
    } catch (error) {
        console.error("Ошибка при получении ведомости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

export const calculateStatementStatistics = async (statementId) => {
    const id = Number(statementId);
    if (isNaN(id)) {
        throw new Error(`Неверный ID ведомости: ${statementId}. Ожидается числовое значение.`);
    }

    console.log(`[STATISTICS] Начало расчета статистики для ведомости ID: ${id}`);

    try {
        // 1. Получаем ведомость
        const statement = await Statement.findByPk(id);
        if (!statement) {
            throw new Error(`Ведомость с ID ${id} не найдена.`);
        }

        // 2. Получаем всех студентов группы
        const students = await Student.findAll({
            where: { groupId: statement.groupId }
        });

        if (!students.length) {
            console.warn(`[STATISTICS] В группе ведомости ${id} нет студентов. Возвращаем null значения.`);
            return {
                overallAverage: null,
                attendancePercentage: null,
                certificationPercentage: null,
                certificationAverage: null
            };
        }

        const studentIds = students.map(student => student.id);
        const totalStudents = studentIds.length;

        // 3. Получаем все занятия ведомости
        const lessons = await Lesson.findAll({
            where: { statementId: id },
            include: [{
                model: Grade,
                as: 'grades',
                attributes: ['studentId', 'value']
            }],
            attributes: ['id']
        });

        if (!lessons.length) {
            console.warn(`[STATISTICS] Ведомость ${id} не содержит занятий. Возвращаем null значения.`);
            return {
                overallAverage: null,
                attendancePercentage: null,
                certificationPercentage: null,
                certificationAverage: null
            };
        }

        let totalGradesSum = 0;
        let totalGradesCount = 0;
        let totalPossibleAttendances = 0;
        let actualAttendances = 0;
        const missedCounts = {};

        for (const lesson of lessons) {
            for (const studentId of studentIds) {
                const grade = (lesson.grades || []).find(g => g.studentId === studentId);

                if (grade) {
                    if (/^[0-9]+$/.test(grade.value)) {
                        const numericValue = parseInt(grade.value);
                        totalGradesSum += numericValue;
                        totalGradesCount++;
                        actualAttendances++;
                    } else if (grade.value === 'не явился') {
                        missedCounts[studentId] = (missedCounts[studentId] || 0) + 1;
                    }
                }
                // Убрано подсчет отсутствия оценки как пропуска
                // Теперь пропуском считается только явное "не явился"
            }

            totalPossibleAttendances += totalStudents;
        }

        const totalMissed = Object.values(missedCounts).reduce((sum, count) => sum + count, 0);
        actualAttendances = totalPossibleAttendances - totalMissed;

        // 4. Получаем аттестационные оценки
        console.log(`[STATISTICS] Получение аттестационных оценок для ведомости ID: ${id}`);
        const certificationGradesRaw = await Grade.findAll({
            where: { statementId: id },
            attributes: ['studentId', 'value']
        });

        const certificationValues = [];
        let totalCertificationPossible = totalStudents;
        let passedCertification = 0;

        for (const studentId of studentIds) {
            const grade = certificationGradesRaw.find(g => g.studentId === studentId);

            if (!grade) {
                // Нет оценки — студент не допущен
                totalCertificationPossible--;
                continue;
            }

            if (grade.value === 'зачет') {
                certificationValues.push(1);
                passedCertification++;
            } else if (grade.value === 'незачет') {
                certificationValues.push(0);
            } else if (/^[0-9]+$/.test(grade.value)) {
                const numericValue = parseInt(grade.value);
                certificationValues.push(numericValue);
                if (numericValue >= 4) {
                    passedCertification++;
                }
            } else if (grade.value === 'не допущен') {
                totalCertificationPossible--;
            }
        }

        // 5. Расчеты
        const attendancePercentage = totalPossibleAttendances > 0
            ? (actualAttendances / totalPossibleAttendances) * 100
            : 0;

        const certificationPercentage = totalCertificationPossible > 0
            ? (passedCertification / totalCertificationPossible) * 100
            : 0;

        const overallAverage = totalGradesCount > 0
            ? totalGradesSum / totalGradesCount
            : null;

        const certificationAverage = certificationValues.length > 0
            ? (certificationValues.reduce((sum, val) => sum + val, 0) / certificationValues.length)
            : null;

        const round = (num) => num !== null ? Math.round(num * 10) / 10 : null;

        const result = {
            overallAverage: round(overallAverage),
            attendancePercentage: round(attendancePercentage),
            certificationPercentage: round(certificationPercentage),
            certificationAverage: round(certificationAverage)
        };

        console.log(`[STATISTICS] Итоговая статистика для ведомости ${id}:`, JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error(`[STATISTICS] Ошибка при расчете статистики ведомости ${id}:`, error);
        throw error;
    }
};
