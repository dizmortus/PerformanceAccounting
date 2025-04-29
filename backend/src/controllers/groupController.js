import { Group, Specialty, Faculty} from "../models/index.js";
import { Statement } from "../models/index.js";
import { Lesson, Grade, Student } from "../models/index.js";
import sequelize from '../config/db.js';
import { Op } from 'sequelize';

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
export const getAllGroups = async (req, res) => {
    try {
        console.log("Запрос на получение списка групп");

        const whereSpecialty = {};

        if (req.user.facultyId) {
            console.log("Применяется фильтр по факультету:", req.user.facultyId);
            whereSpecialty.facultyId = req.user.facultyId;
        }

        const groups = await Group.findAll({
            attributes: [
                "id",
                "specialtyId",
                "admissionYear",
                "educationForm",
                "educationLevel"
            ],
            include: [{
                model: Specialty,
                as: 'specialty', // Указываем алиас, который использовали в ассоциации
                attributes: [], // Не включаем поля Specialty в результат
                where: whereSpecialty
            }]
        });

        console.log("Полученные группы:");
        groups.forEach((group, index) => {
            console.log(`Группа #${index + 1}:`, JSON.stringify(group, null, 2));
        });

        res.json(groups);
    } catch (error) {
        console.error("Ошибка при получении списка групп:", error);
        res.status(500).json({ 
            error: "Ошибка сервера",
            details: error.message 
        });
    }
};


export const createGroup = async (req, res) => {
    const { id, specialtyId, admissionYear, educationForm, educationLevel } = req.body;

    console.log("Данные запроса на создание группы:", req.body);

    try {
        // Проверяем, существует ли уже группа с таким ID
        const existingGroup = await Group.findOne({ where: { id } });
        if (existingGroup) {
            return res.status(400).json({ error: "Группа с таким ID уже существует" });
        }

        // Проверяем существование специальности
        const specialty = await Specialty.findByPk(specialtyId);
        if (!specialty) {
            return res.status(400).json({ error: "Указанная специальность не существует" });
        }

        // Проверяем, что форма обучения соответствует допустимым значениям
        const validEducationForms = ['дневная', 'заочная', 'дистанционная'];
        if (!validEducationForms.includes(educationForm)) {
            return res.status(400).json({ 
                error: "Некорректная форма обучения",
                validForms: validEducationForms
            });
        }

        // Проверяем, что ступень обучения соответствует допустимым значениям
        if (educationLevel !== 1 && educationLevel !== 2) {
            return res.status(400).json({ 
                error: "Некорректная ступень обучения",
                validLevels: [1, 2]
            });
        }

        // Проверяем год поступления
        const currentYear = new Date().getFullYear();
        if (admissionYear < 2000 || admissionYear > currentYear) {
            return res.status(400).json({ 
                error: "Некорректный год поступления",
                minYear: 2000,
                maxYear: currentYear
            });
        }

        // Создаем новую группу
        const newGroup = await Group.create({
            id,  // передаем сгенерированный ID
            specialtyId,
            admissionYear,
            educationForm,
            educationLevel
        });

        res.status(201).json({ 
            message: "Группа успешно создана",
            group: {
                id: newGroup.id,  // ID, который был передан из клиента
                specialtyId: newGroup.specialtyId,
                admissionYear: newGroup.admissionYear,
                educationForm: newGroup.educationForm,
                educationLevel: newGroup.educationLevel
            }
        });

    } catch (error) {
        console.error("Ошибка при создании группы:", error);
        res.status(500).json({ 
            error: "Ошибка сервера при создании группы",
            details: error.message 
        });
    }
};


export const updateGroup = async (req, res) => {
    const { id: oldId } = req.params;
    const { id: newId, specialtyId, admissionYear, educationForm, educationLevel } = req.body;

    try {
        // Находим группу
        const group = await Group.findByPk(oldId, {
            include: [
                { model: Student, as: 'students' },
                { model: Statement, as: 'groupStatements' }
            ]
        });
        
        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        // Проверяем новый ID, если он предоставлен
        if (newId && newId !== oldId) {
            const existingGroup = await Group.findByPk(newId);
            if (existingGroup) {
                return res.status(400).json({ error: "Группа с таким ID уже существует" });
            }
        }

        // Проверяем существование специальности
        if (specialtyId && specialtyId !== group.specialtyId) {
            const specialty = await Specialty.findByPk(specialtyId);
            if (!specialty) {
                return res.status(400).json({ error: "Указанная специальность не существует" });
            }
        }

        // Валидация данных
        const currentYear = new Date().getFullYear();
        if (admissionYear && (admissionYear < 2000 || admissionYear > currentYear)) {
            return res.status(400).json({ 
                error: "Некорректный год поступления",
                minYear: 2000,
                maxYear: currentYear
            });
        }

        const validEducationForms = ['дневная', 'заочная', 'дистанционная'];
        if (educationForm && !validEducationForms.includes(educationForm)) {
            return res.status(400).json({ 
                error: "Некорректная форма обучения",
                validForms: validEducationForms
            });
        }

        if (educationLevel && educationLevel !== 1 && educationLevel !== 2) {
            return res.status(400).json({ 
                error: "Некорректная ступень обучения",
                validLevels: [1, 2]
            });
        }

        // Подготавливаем данные для обновления
        const updateData = {
            id: newId || group.id,
            specialtyId: specialtyId || group.specialtyId,
            admissionYear: admissionYear || group.admissionYear,
            educationForm: educationForm || group.educationForm,
            educationLevel: educationLevel || group.educationLevel
        };

        // Используем транзакцию для атомарности операций
        await sequelize.transaction(async (t) => {
            if (newId && newId !== oldId) {
                // 1. Обновляем ID группы
                await Group.update(
                    { id: newId },
                    {
                        where: { id: oldId },
                        transaction: t
                    }
                );

                // 2. Каскадное обновление студентов группы
                if (group.students && group.students.length > 0) {
                    await Student.update(
                        { groupId: newId },
                        {
                            where: { groupId: oldId },
                            transaction: t
                        }
                    );
                }

                // 3. Каскадное обновление ведомостей группы
                if (group.groupStatements && group.groupStatements.length > 0) {
                    await Statement.update(
                        { groupId: newId },
                        {
                            where: { groupId: oldId },
                            transaction: t
                        }
                    );
                }
            }

            // Обновляем остальные данные группы (кроме ID, если он изменялся)
            await Group.update(
                {
                    specialtyId: updateData.specialtyId,
                    admissionYear: updateData.admissionYear,
                    educationForm: updateData.educationForm,
                    educationLevel: updateData.educationLevel
                },
                {
                    where: { id: newId || oldId },
                    transaction: t
                }
            );
        });

        // Получаем обновленные данные группы
        const updatedGroup = await Group.findByPk(newId || oldId, {
            include: [{
                model: Specialty,
                as: 'specialty',
                include: [{
                    model: Faculty,
                    as: 'faculty'
                }]
            }]
        });

        res.json({ 
            message: "Данные группы успешно обновлены",
            group: {
                id: updatedGroup.id,
                specialtyId: updatedGroup.specialtyId,
                specialtyName: updatedGroup.specialty?.name,
                facultyName: updatedGroup.faculty?.name,
                admissionYear: updatedGroup.admissionYear,
                educationForm: updatedGroup.educationForm,
                educationLevel: updatedGroup.educationLevel
            }
        });

    } catch (error) {
        console.error("Ошибка при обновлении группы:", error);
        res.status(500).json({ 
            error: "Ошибка сервера при обновлении группы",
            details: error.message 
        });
    }
};

export const deleteGroup = async (req, res) => {
    const { id } = req.params;

    try {
        const group = await Group.findByPk(id);
        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        // Проверяем, есть ли связанные студенты или ведомости
        const studentsCount = await group.countStudents();
        const statementsCount = await group.countStatements();

        if (studentsCount > 0 || statementsCount > 0) {
            return res.status(400).json({ 
                error: "Невозможно удалить группу",
                details: `Группа имеет ${studentsCount} студентов и ${statementsCount} ведомостей`
            });
        }

        await group.destroy();
        res.json({ message: "Группа успешно удалена" });

    } catch (error) {
        console.error("Ошибка при удалении группы:", error);
        res.status(500).json({ 
            error: "Ошибка сервера при удалении группы",
            details: error.message 
        });
    }
};

// Существующие методы getGroupById и getAllGroups остаются без изменений

export const hasGroupDependencies = async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findByPk(groupId);

        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        const studentsCount = await group.countStudents();
        const statementsCount = await group.countStatements();
        const hasDependencies = studentsCount > 0 || statementsCount > 0;

        res.json({
            hasDependencies,
            details: {
                hasStudents: studentsCount > 0,
                hasStatements: statementsCount > 0,
                totalDependencies: studentsCount + statementsCount
            }
        });

    } catch (error) {
        console.error("Ошибка при проверке зависимостей группы:", error);
        res.status(500).json({
            error: "Ошибка сервера при проверке зависимостей группы",
            details: error.message
        });
    }
};
export const calculateGroupStatistics = async (groupId, semester = null, statementId = null) => {
    const groupIdNum = Number(groupId);
    if (isNaN(groupIdNum)) {
        throw new Error(`Неверный ID группы: ${groupId}. Ожидается числовое значение.`);
    }

    console.log(`[STATISTICS] Начало расчета статистики для группы ID: ${groupIdNum}, семестр: ${semester}, ведомость: ${statementId}`);

    try {
        // 1. Получаем всех студентов группы
        const students = await Student.findAll({
            where: { groupId: groupIdNum }
        });

        if (!students.length) {
            console.warn(`[STATISTICS] В группе ${groupIdNum} нет студентов. Возвращаем пустой результат.`);
            return {
                students: [],
                groupAverage: null,
                groupAttendance: null,
                groupMissedLessons: null,
                groupCertificationPercentage: null,
                groupCertificationAverage: null
            };
        }

        const studentIds = students.map(student => student.id);

        // 2. Получаем ведомости в зависимости от параметров
        let statements;
        let isPracticeType = false; // Флаг для ведомостей типа "практика"
        let isCourseProjectType = false; // Флаг для ведомостей типа "курсовой проект"
        
        if (statementId) {
            const statement = await Statement.findByPk(statementId);
            if (!statement) {
                throw new Error(`Ведомость с ID ${statementId} не найдена.`);
            }
            statements = [statement];
            isPracticeType = statement.assessmentType === 'практика';
            isCourseProjectType = statement.assessmentType === 'курсовой проект';
        } else if (semester) {
            statements = await Statement.findAll({
                where: { 
                    groupId: groupIdNum,
                    semester: semester 
                }
            });
        } else {
            statements = await Statement.findAll({
                where: { groupId: groupIdNum }
            });
        }

        if (!statements.length) {
            console.warn(`[STATISTICS] Не найдено ведомостей для группы ${groupIdNum} с указанными параметрами. Возвращаем пустой результат.`);
            return {
                students: [],
                groupAverage: null,
                groupAttendance: null,
                groupMissedLessons: null,
                groupCertificationPercentage: null,
                groupCertificationAverage: null
            };
        }

        // 3. Собираем статистику по каждому студенту
        const studentStats = {};
        students.forEach(student => {
            studentStats[student.id] = {
                studentId: student.id,
                lastName: student.lastName,
                firstName: student.firstName,
                patronymic: student.patronymic,
                totalGradesSum: 0,
                totalGradesCount: 0,
                totalPossibleAttendances: 0,
                missedLessons: 0,
                certificationValues: [],
                passedCertification: 0,
                totalCertificationPossible: 0
            };
        });

        // 4. Обрабатываем каждую ведомость
        for (const statement of statements) {
            const lessons = await Lesson.findAll({
                where: { statementId: statement.id },
                include: [{
                    model: Grade,
                    as: 'grades',
                    attributes: ['studentId', 'value']
                }],
                attributes: ['id']
            });

            // Для ведомостей типа "практика" или "курсовой проект" пропускаем подсчет посещаемости
            if (statement.assessmentType !== 'практика' && statement.assessmentType !== 'курсовой проект') {
                for (const lesson of lessons) {
                    for (const studentId of studentIds) {
                        const stats = studentStats[studentId];
                        stats.totalPossibleAttendances++;

                        const grade = (lesson.grades || []).find(g => g.studentId === studentId);

                        if (grade && grade.value === 'не явился') {
                            stats.missedLessons++;
                        } else if (grade && /^[0-9]+$/.test(grade.value)) {
                            const numericGrade = parseInt(grade.value);
                            stats.totalGradesSum += numericGrade;
                            stats.totalGradesCount++;
                        }
                    }
                }
            }

            // Аттестационные оценки
            const certificationGradesRaw = await Grade.findAll({
                where: { 
                    statementId: statement.id,
                    lessonId: null
                },
                attributes: ['studentId', 'value']
            });
            
            for (const studentId of studentIds) {
                const stats = studentStats[studentId];
                const grade = certificationGradesRaw.find(g => g.studentId === studentId);
            
                if (!grade) continue;
            
                stats.totalCertificationPossible++;
            
                if (grade.value === 'зачтено' || (isCourseProjectType && grade.value === 'отлично')) {
                    stats.passedCertification++;
                    if (isCourseProjectType) {
                        // Для курсового проекта преобразуем "отлично" в числовое значение
                        stats.certificationValues.push(5);
                    }
                } else if (grade.value === 'не зачтено' || grade.value === 'не явился' || grade.value === 'не допущен') {
                    // Ничего не добавляем
                } else if (isCourseProjectType && grade.value === 'хорошо') {
                    stats.passedCertification++;
                    stats.certificationValues.push(4);
                } else if (isCourseProjectType && grade.value === 'удовлетворительно') {
                    stats.passedCertification++;
                    stats.certificationValues.push(3);
                } else if (/^[0-9]+$/.test(grade.value)) {
                    const numericValue = parseInt(grade.value);
                    stats.certificationValues.push(numericValue);
                    if (numericValue >= 4) {
                        stats.passedCertification++;
                    }
                }
            }
        }

        // 5. Формируем результаты для каждого студента
        const round = (num) => num !== null ? Math.round(num * 10) / 10 : null;
        const results = [];

        for (const studentId in studentStats) {
            const stats = studentStats[studentId];
            
            // Для ведомостей типа "практика" или "курсовой проект" устанавливаем посещаемость и пропуски в null
            const attendancePercentage = (isPracticeType || isCourseProjectType) 
                ? null 
                : stats.totalPossibleAttendances > 0
                    ? ((stats.totalPossibleAttendances - stats.missedLessons) / stats.totalPossibleAttendances) * 100
                    : 0;

            const missedLessons = (isPracticeType || isCourseProjectType) ? null : stats.missedLessons;

            const certificationPercentage = stats.totalCertificationPossible > 0
                ? (stats.passedCertification / stats.totalCertificationPossible) * 100
                : 0;

            const averageGrade = stats.totalGradesCount > 0
                ? stats.totalGradesSum / stats.totalGradesCount
                : null;

            let certificationGrade = null;
            if (statementId && stats.certificationValues.length > 0) {
                certificationGrade = stats.certificationValues[stats.certificationValues.length - 1];
            } else if (stats.certificationValues.length > 0) {
                certificationGrade = stats.certificationValues.reduce((sum, val) => sum + val, 0) / stats.certificationValues.length;
            }

            results.push({
                studentId: stats.studentId,
                lastName: stats.lastName,
                firstName: stats.firstName,
                patronymic: stats.patronymic,
                attendancePercentage: round(attendancePercentage),
                missedLessons: missedLessons,
                totalPossibleAttendances: (isPracticeType || isCourseProjectType) ? null : stats.totalPossibleAttendances,
                averageGrade: round(averageGrade),
                certificationPercentage: round(certificationPercentage),
                certificationGrade: round(certificationGrade)
            });
        }

        // 6. Рассчитываем средние значения по группе
        const validAttendance = results.filter(r => r.attendancePercentage !== null);
        const groupAttendance = (isPracticeType || isCourseProjectType) 
            ? null 
            : validAttendance.length > 0
                ? validAttendance.reduce((sum, r) => sum + r.attendancePercentage, 0) / validAttendance.length
                : null;

        const totalMissedLessons = results.reduce((sum, r) => sum + (r.missedLessons || 0), 0);
        const groupMissedLessons = (isPracticeType || isCourseProjectType) 
            ? null 
            : results.length > 0 
                ? totalMissedLessons / results.length
                : null;

        const validGrades = results.filter(r => r.averageGrade !== null);
        const groupAverage = validGrades.length > 0
            ? validGrades.reduce((sum, r) => sum + r.averageGrade, 0) / validGrades.length
            : null;

        const validCertPercentage = results.filter(r => r.certificationPercentage !== null);
        const groupCertificationPercentage = validCertPercentage.length > 0
            ? validCertPercentage.reduce((sum, r) => sum + r.certificationPercentage, 0) / validCertPercentage.length
            : null;

        const validCertGrades = results.filter(r => r.certificationGrade !== null);
        const groupCertificationAverage = validCertGrades.length > 0
            ? validCertGrades.reduce((sum, r) => sum + r.certificationGrade, 0) / validCertGrades.length
            : null;

        // 7. Формируем итоговый результат
        const finalResult = {
            students: results,
            groupAverage: round(groupAverage),
            groupAttendance: round(groupAttendance),
            groupMissedLessons: round(groupMissedLessons),
            groupCertificationPercentage: round(groupCertificationPercentage),
            groupCertificationAverage: round(groupCertificationAverage)
        };

        console.log(`[STATISTICS] Итоговая статистика для группы ${groupIdNum}:`, JSON.stringify(finalResult, null, 2));
        return finalResult;
    } catch (error) {
        console.error(`[STATISTICS] Ошибка при расчете статистики группы ${groupIdNum}:`, error);
        throw error;
    }
};