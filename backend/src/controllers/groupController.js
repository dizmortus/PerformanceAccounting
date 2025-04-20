import { Group, Specialty } from "../models/index.js";

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
    const { id } = req.params;
    const { specialtyId, admissionYear, educationForm, educationLevel } = req.body;

    try {
        const group = await Group.findByPk(id);
        if (!group) {
            return res.status(404).json({ error: "Группа не найдена" });
        }

        // Проверяем существование специальности, если она меняется
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

        // Обновляем данные группы
        await group.update({
            specialtyId: specialtyId || group.specialtyId,
            admissionYear: admissionYear || group.admissionYear,
            educationForm: educationForm || group.educationForm,
            educationLevel: educationLevel || group.educationLevel
        });

        res.json({ 
            message: "Данные группы успешно обновлены",
            group: {
                id: group.id,
                specialtyId: group.specialtyId,
                admissionYear: group.admissionYear,
                educationForm: group.educationForm,
                educationLevel: group.educationLevel
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