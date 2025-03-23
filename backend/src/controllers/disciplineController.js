import { Discipline } from "../models/index.js";

export const getDisciplineById = async (req, res) => {
    try {
        const { id } = req.params; // Получаем ID дисциплины из параметров запроса

        const discipline = await Discipline.findByPk(id, {
            attributes: ["id", "name"]
        });

        if (!discipline) {
            console.log(`Дисциплина с id = ${id} не найдена.`);
            return res.status(404).json({ error: "Дисциплина не найдена" });
        }

        console.log("Найденная дисциплина:", discipline.toJSON());

        res.json(discipline);
    } catch (error) {
        console.error("Ошибка при получении данных дисциплины:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

export const getAllDisciplines = async (req, res) => {
    try {
        // Получаем все дисциплины без пагинации и сортировки
        const disciplines = await Discipline.findAll({
            attributes: ["id", "name"]
        });

        // Если дисциплины не найдены, возвращаем пустой массив
        if (!disciplines || disciplines.length === 0) {
            return res.status(404).json({ error: "Дисциплины не найдены" });
        }

        // Возвращаем список дисциплин
        res.json(disciplines);
    } catch (error) {
        console.error("Ошибка при получении дисциплин:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};