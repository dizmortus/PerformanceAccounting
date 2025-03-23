// Убедитесь, что импорт модели `Grade` не повторяется
import { Grade } from "../models/index.js";

export const getGradeByStatementAndStudent = async (req, res) => {
  try {
    const { statementId, studentId } = req.params;

    if (!statementId || !studentId) {
      return res.status(400).json({ message: "ID ведомости и ID студента обязательны" });
    }

    const grade = await Grade.findOne({
      where: { statementId, studentId },
      attributes: ["id", "statementId", "studentId", "value"]
    });

    if (!grade) {
      return res.status(404).json({ message: "Оценка не найдена" });
    }

    res.status(200).json(grade);
  } catch (error) {
    console.error("Ошибка при получении оценки:", error);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
};
export const setGrade = async (req, res) => {
  try {
    const { statementId, studentId } = req.params;
    const { value } = req.body;

    if (!statementId || !studentId) {
      return res.status(400).json({ message: "ID ведомости и ID студента обязательны" });
    }

    if (value === undefined) {
      return res.status(400).json({ message: "Оценка обязательна" });
    }

    const validGrades = [
      "зачтено", "не зачтено", "не явился", "не допущен",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
    ];

    if (!validGrades.includes(value)) {
      return res.status(400).json({ message: "Некорректное значение оценки" });
    }

    // Проверяем существование оценки
    const existingGrade = await Grade.findOne({
      where: {
        statementId, // Используем правильные имена полей
        studentId
      }
    });

    if (existingGrade) {
      // Если запись существует - обновляем
      await existingGrade.update({ value });
      return res.status(200).json({ message: "Оценка обновлена", grade: existingGrade });
    } else {
      // Если записи нет - создаем новую
      const newGrade = await Grade.create({
        statementId,
        studentId,
        value
      });
      return res.status(201).json({ message: "Оценка добавлена", grade: newGrade });
    }
  } catch (error) {
    console.error("Ошибка при установке оценки:", error);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
};



export const getPossibleGrades = async (req, res) => {
  try {
    // Все возможные оценки
    const gradeOptions = {
      "зачет": ["зачтено", "не зачтено", "не явился", "не допущен"],
      "экзамен": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "не явился", "не допущен"]
    };

    console.log("Возвращаемые возможные оценки:", JSON.stringify(gradeOptions, null, 2));

    res.status(200).json(gradeOptions);
  } catch (error) {
    console.error("Ошибка при получении возможных значений оценок:", error);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
};

