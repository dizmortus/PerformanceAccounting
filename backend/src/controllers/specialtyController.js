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

