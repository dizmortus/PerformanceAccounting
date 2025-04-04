import { EducationalProcess, Group, Specialty, Discipline, User } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Получение учебных процессов преподавателя
 */
export const getTeacherEducationalProcesses = async (req, res) => {
    try {
        const { login } = req.user;

        const processes = await EducationalProcess.findAll({
            where: { teacherLogin: login },
            include: [
                { model: Discipline, as: 'discipline' },
                { model: Group, as: 'group', include: ['specialty'] }
            ],
            attributes: [
                "id",
                "teacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester"
            ]
        });

        res.json(processes);
    } catch (error) {
        console.error("Ошибка при получении учебных процессов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Проверка наличия учебных процессов у преподавателя
 */
export const hasTeacherEducationalProcesses = async (teacherLogin) => {
    try {
        const processes = await EducationalProcess.findOne({
            where: { teacherLogin },
        });

        return !!processes;
    } catch (error) {
        console.error("Ошибка при проверке учебных процессов преподавателя:", error);
        throw error;
    }
};

/**
 * Создание нового учебного процесса
 */
export const createEducationalProcess = async (req, res) => {
    try {
        const { teacherLogin, disciplineId, groupId, practiceHours, semester } = req.body;

        // Проверка обязательных полей
        if (!teacherLogin || !disciplineId || !groupId || !practiceHours || !semester) {
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

        const facultyId = specialty.facultyId;

        // Преобразуем facultyId в строку с фиксированной длиной
        const facultyIdStr = facultyId.toString().padStart(3, '0');

        // Поиск максимального ID среди процессов, начинающихся с кода факультета
        const maxIdProcess = await EducationalProcess.findOne({
            where: {
                id: {
                    [Op.between]: [facultyId * 1000000, (facultyId + 1) * 1000000 - 1]
                }
            },
            order: [['id', 'DESC']],
            attributes: ['id']
        });

        // Генерация нового ID
        let newProcessId;
        if (maxIdProcess) {
            const lastId = maxIdProcess.id.toString();
            const lastNumber = parseInt(lastId.slice(3), 10);
            newProcessId = parseInt(`${facultyIdStr}${(lastNumber + 1).toString().padStart(6, '0')}`, 10);
        } else {
            newProcessId = parseInt(`${facultyIdStr}000001`, 10);
        }

        // Создание нового учебного процесса
        const newProcess = await EducationalProcess.create({
            id: newProcessId,
            teacherLogin,
            disciplineId,
            groupId,
            practiceHours,
            semester
        });

        res.status(201).json(newProcess);
    } catch (error) {
        console.error("Ошибка при создании учебного процесса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Изменение учебного процесса
 */
export const updateEducationalProcess = async (req, res) => {
    try {
        const { id } = req.params;
        const { teacherLogin, disciplineId, groupId, practiceHours, semester } = req.body;

        const process = await EducationalProcess.findByPk(id);
        if (!process) {
            return res.status(404).json({ error: "Учебный процесс не найден" });
        }

        process.teacherLogin = teacherLogin || process.teacherLogin;
        process.disciplineId = disciplineId || process.disciplineId;
        process.groupId = groupId || process.groupId;
        process.practiceHours = practiceHours || process.practiceHours;
        process.semester = semester || process.semester;

        await process.save();

        res.json(process);
    } catch (error) {
        console.error("Ошибка при изменении учебного процесса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Удаление учебного процесса
 */
export const deleteEducationalProcess = async (req, res) => {
    try {
        const { id } = req.params;

        const process = await EducationalProcess.findByPk(id);
        if (!process) {
            return res.status(404).json({ error: "Учебный процесс не найден" });
        }

        await process.destroy();

        res.json({ message: "Учебный процесс успешно удален" });
    } catch (error) {
        console.error("Ошибка при удалении учебного процесса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

/**
 * Получение всех учебных процессов
 */
export const getAllEducationalProcesses = async (req, res) => {
    try {
        const processes = await EducationalProcess.findAll({
            include: [
                { model: User, as: 'teacher' },
                { model: Discipline, as: 'discipline' },
                { model: Group, as: 'group', include: ['specialty'] }
            ],
            attributes: [
                "id",
                "teacherLogin",
                "disciplineId",
                "groupId",
                "practiceHours",
                "semester"
            ]
        });

        res.json(processes);
    } catch (error) {
        console.error("Ошибка при получении всех учебных процессов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};