import { Faculty } from "../models/index.js";

export const getFacultyById = async (req, res) => {
    try {
        let { id } = req.params;

        // Проверяем, является ли id корректным числом
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ error: "Некорректный ID факультета" });
        }

        const faculty = await Faculty.findByPk(Number(id), {
            attributes: ["id", "name", "deanLastName", "deanFirstName", "deanPatronymic"]
        });

        if (!faculty) {
            return res.status(404).json({ error: "Факультет не найден" });
        }

        res.json(faculty);
    } catch (error) {
        console.error("Ошибка при получении данных факультета:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};
