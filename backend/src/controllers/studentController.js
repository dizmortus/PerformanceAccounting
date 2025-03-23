import { Student } from "../models/index.js"; // Проверьте путь к models/index.js


export const getStudentsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log("Полученный groupId:", groupId, typeof groupId); // Логируем значение

    if (!groupId) {
      return res.status(400).json({ message: "ID группы не указан" });
    }

    const students = await Student.findAll({
      where: { groupId: Number(groupId) }, // Преобразование в число
      attributes: ["id", "lastName", "firstName", "patronymic"]
    });

    //console.log("Найденные студенты:", JSON.stringify(students, null, 2)); // Логируем список студентов

    if (!students.length) {
      return res.status(404).json({ message: "Студенты не найдены" });
    }

    res.status(200).json(students);
  } catch (error) {
    console.error("Ошибка при получении студентов группы:", error);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
};
