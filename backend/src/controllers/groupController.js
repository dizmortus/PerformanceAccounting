import { Group } from "../models/index.js";

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