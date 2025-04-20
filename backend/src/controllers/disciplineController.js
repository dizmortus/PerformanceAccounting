import { Discipline } from "../models/index.js";


// Discipline Controllers
export const getDisciplineById = async (req, res) => {
    try {
        const { id } = req.params;

        const discipline = await Discipline.findByPk(id, {
            attributes: ["id", "name", "facultyId", "isPractice"]
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
        const disciplines = await Discipline.findAll({
            attributes: ["id", "name", "facultyId", "isPractice"]
        });

        if (!disciplines || disciplines.length === 0) {
            return res.status(404).json({ error: "Дисциплины не найдены" });
        }

        res.json(disciplines);
    } catch (error) {
        console.error("Ошибка при получении дисциплин:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

export const createDiscipline = async (req, res) => {
    const { name, facultyId, isPractice = false } = req.body;

    try {
        const newDiscipline = await Discipline.create({
            name,
            facultyId,
            isPractice
        });

        res.status(201).json(newDiscipline);
    } catch (error) {
        console.error("Ошибка при создании дисциплины:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

export const updateDiscipline = async (req, res) => {
    const { id } = req.params;
    const { name, facultyId, isPractice } = req.body;

    try {
        const discipline = await Discipline.findByPk(id);
        if (!discipline) {
            return res.status(404).json({ error: "Дисциплина не найдена" });
        }

        await discipline.update({
            name: name || discipline.name,
            facultyId: facultyId !== undefined ? facultyId : discipline.facultyId,
            isPractice: isPractice !== undefined ? isPractice : discipline.isPractice
        });

        res.json(discipline);
    } catch (error) {
        console.error("Ошибка при обновлении дисциплины:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};

export const deleteDiscipline = async (req, res) => {
    const { id } = req.params;

    try {
        const discipline = await Discipline.findByPk(id);
        if (!discipline) {
            return res.status(404).json({ error: "Дисциплина не найдена" });
        }

        await discipline.destroy();
        res.json({ message: "Дисциплина успешно удалена" });
    } catch (error) {
        console.error("Ошибка при удалении дисциплины:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
};