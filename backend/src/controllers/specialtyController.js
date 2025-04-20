import { Specialty } from "../models/index.js";

export const getSpecialtyById = async (req, res) => {
    try {
        let { id } = req.params;

        // Проверяем, является ли id корректным числом
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ error: "Некорректный ID специальности" });
        }

        const specialty = await Specialty.findByPk(Number(id), {
            attributes: ["id", "name", "facultyId", "coursesCount"]
        });

        if (!specialty) {
            return res.status(404).json({ error: "Специальность не найдена" });
        }

        res.json(specialty);
    } catch (error) {
        console.error("Ошибка при получении данных специальности:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};



export const getAllSpecialties = async (req, res) => {
    try {
        console.log("Запрос на получение списка специальностей");

        const whereClause = {};

        // Если у пользователя есть привязка к факультету, фильтруем по нему
        if (req.user.facultyId) {
            console.log("Применяется фильтр по факультету:", req.user.facultyId);
            whereClause.facultyId = req.user.facultyId;
        }

        const specialties = await Specialty.findAll({
            attributes: [
                "id",
                "name",
                "facultyId",
                "coursesCount"
            ],
            where: whereClause,
            order: [['name', 'ASC']] // Сортировка по названию
        });

        console.log("Полученные специальности:");
        specialties.forEach((specialty, index) => {
            console.log(`Специальность #${index + 1}:`, JSON.stringify(specialty, null, 2));
        });

        res.json(specialties);
    } catch (error) {
        console.error("Ошибка при получении списка специальностей:", error);
        res.status(500).json({ 
            error: "Ошибка сервера при получении списка специальностей",
            details: error.message 
        });
    }
};