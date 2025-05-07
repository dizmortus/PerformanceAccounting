import { Grade, Statement, Lesson, Student } from "../models/index.js";
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
/**
 * Получение оценки по ведомости/занятию и студенту
 */
export const getGrades = async (req, res) => {
  console.log('Начало обработки запроса на получение оценок:', {
    params: req.params,
    query: req.query,
    user: req.user?.id
  });

  try {
    const { statementId, lessonId } = req.query;
    let studentIds = req.query.studentIds;

    // Нормализация studentIds
    if (studentIds) {
      studentIds = Array.isArray(studentIds) ? studentIds : [studentIds];
    }

    // Валидация входных данных
    if (!statementId && !lessonId) {
      return res.status(400).json({ error: "Укажите ID ведомости или занятия" });
    }

    if (statementId && lessonId) {
      return res.status(400).json({ error: "Укажите только ID ведомости или только ID занятия" });
    }

    // Построение условия для поиска
    const where = {
      [statementId ? 'statementId' : 'lessonId']: statementId || lessonId
    };
    
    if (studentIds?.length) {
      where.studentId = studentIds;
    }

    // Получаем только необходимые данные об оценках
    const grades = await Grade.findAll({
      where,
      attributes: ["id", "value", "studentId"],
      raw: true // Возвращаем простые объекты вместо экземпляров модели
    });
    console.log('Возвращено:',grades);
    res.status(200).json({
      entityType: statementId ? "statement" : "lesson",
      grades
    });
  } catch (error) {
    console.error("Ошибка при получении оценок:", error);
    return res.status(500).json({ 
      error: "Ошибка сервера",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
export const setGrades = async (req, res) => {
  console.log('Начало обработки запроса на установку оценок:', {
    params: req.params,
    body: req.body,
    user: req.user?.id
  });

  try {
    const { grades } = req.body;

    // Валидация входных данных
    if (!Array.isArray(grades) || grades.length === 0) {
      console.error('Ошибка валидации: отсутствуют данные оценок');
      return res.status(400).json({ error: "Необходим массив оценок" });
    }

    // Проверка каждой оценки
    const validGrades = [
      "зачтено", "не зачтено", "не явился", "не допущен",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
    ];

    for (const gradeData of grades) {
      const { studentId, statementId, lessonId, value } = gradeData;

      if (!studentId) {
        console.error('Ошибка валидации: отсутствует ID студента');
        return res.status(400).json({ error: "ID студента обязателен для всех оценок" });
      }

      if (!statementId && !lessonId) {
        console.error('Ошибка валидации: не указана ведомость или занятие');
        return res.status(400).json({ error: "Укажите ID ведомости или занятия для всех оценок" });
      }

      if (statementId && lessonId) {
        console.error('Ошибка валидации: указаны и ведомость и занятие');
        return res.status(400).json({ error: "Оценка может быть связана только с ведомостью ИЛИ только с занятием" });
      }

      if (!value) {
        console.error('Ошибка валидации: отсутствует значение оценки');
        return res.status(400).json({ error: "Оценка обязательна для всех записей" });
      }

      const normalizedValue = String(value).trim().toLowerCase();
      if (!validGrades.includes(normalizedValue)) {
        console.error('Ошибка валидации: некорректное значение оценки', normalizedValue);
        return res.status(400).json({ error: `Некорректное значение оценки для студента ${studentId}` });
      }

      gradeData.normalizedValue = normalizedValue;
    }

    // Получаем все необходимые ID студентов и сущностей
    const studentIds = [...new Set(grades.map(g => g.studentId))];
    const statementIds = [...new Set(grades.filter(g => g.statementId).map(g => g.statementId))];
    const lessonIds = [...new Set(grades.filter(g => g.lessonId).map(g => g.lessonId))];

    // Проверка существования всех студентов и сущностей
    console.log('Проверка существования студентов и сущностей...');
    const [students, statements, lessons] = await Promise.all([
      Student.findAll({ where: { id: studentIds } }),
      statementIds.length > 0 ? Statement.findAll({ where: { id: statementIds } }) : Promise.resolve([]),
      lessonIds.length > 0 ? Lesson.findAll({ where: { id: lessonIds } }) : Promise.resolve([])
    ]);

    // Проверяем, что все студенты существуют
    const existingStudentIds = students.map(s => s.id);
    const missingStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));
    if (missingStudentIds.length > 0) {
      console.error('Следующие студенты не найдены:', missingStudentIds);
      return res.status(404).json({ error: "Некоторые студенты не найдены", missingStudentIds });
    }

    // Проверяем, что все ведомости существуют
    const existingStatementIds = statements.map(s => s.id);
    const missingStatementIds = statementIds.filter(id => !existingStatementIds.includes(id));
    if (missingStatementIds.length > 0) {
      console.error('Следующие ведомости не найдены:', missingStatementIds);
      return res.status(404).json({ error: "Некоторые ведомости не найдены", missingStatementIds });
    }

    // Проверяем, что все занятия существуют
    const existingLessonIds = lessons.map(l => l.id);
    const missingLessonIds = lessonIds.filter(id => !existingLessonIds.includes(id));
    if (missingLessonIds.length > 0) {
      console.error('Следующие занятия не найдены:', missingLessonIds);
      return res.status(404).json({ error: "Некоторые занятия не найдены", missingLessonIds });
    }

    // Получаем все существующие оценки для обновления
    const whereConditions = grades.map(grade => ({
      studentId: grade.studentId,
      ...(grade.statementId ? { statementId: grade.statementId } : { lessonId: grade.lessonId })
    }));

    console.log('Поиск существующих оценок...');
    const existingGrades = await Grade.findAll({ 
      where: { [Op.or]: whereConditions } 
    });

    // Подготовка операций для транзакции
    const operations = grades.map(grade => {
      const { studentId, statementId, lessonId, normalizedValue } = grade;
      const existingGrade = existingGrades.find(g => 
        g.studentId === studentId && 
        ((statementId && g.statementId === statementId) || (lessonId && g.lessonId === lessonId))
      );

      const gradeData = {
        studentId,
        value: normalizedValue,
        ...(statementId ? { statementId } : { lessonId })
      };

      return {
        gradeData,
        existingGrade
      };
    });

    // Выполняем все операции в транзакции
    console.log('Выполнение операций с оценками...');
    const transaction = await sequelize.transaction();
    try {
      const results = await Promise.all(operations.map(async ({ gradeData, existingGrade }) => {
        if (existingGrade) {
          return existingGrade.update(gradeData, { transaction });
        } else {
          return Grade.create(gradeData, { transaction });
        }
      }));

      await transaction.commit();

      // Формируем ответ
      const response = results.map((result, index) => ({
        studentId: result.studentId,
        value: result.value,
        entityType: grades[index].statementId ? "statement" : "lesson",
        entityId: grades[index].statementId || grades[index].lessonId,
        status: operations[index].existingGrade ? "updated" : "created",
        gradeId: result.id
      }));

      console.log('Оценки успешно обработаны:', {
        created: response.filter(r => r.status === 'created').length,
        updated: response.filter(r => r.status === 'updated').length
      });

      return res.status(201).json({
        message: "Оценки успешно обработаны",
        results: response
      });

    } catch (transactionError) {
      await transaction.rollback();
      console.error("Ошибка транзакции при обработке оценок:", transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error("Критическая ошибка при установке оценок:", error);
    return res.status(500).json({ 
      error: "Ошибка сервера при обработке оценок",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
/**
 * Получение возможных значений оценок
 */
export const getPossibleGrades = async (req, res) => {
  try {
    const numericGrades = Array.from({ length: 11 }, (_, i) => (10 - i).toString());

    const gradeOptions = {
      "зачет": ["зачтено", "не зачтено", "не явился", "не допущен"],
      "экзамен": [...numericGrades, "не явился", "не допущен"],
      "занятие": [...numericGrades, "не явился"],
      "курсовой проект": [...numericGrades, "не явился"],
      "практика": [...numericGrades, "не явился"],
      "дифференцированный зачет": [...numericGrades, "не явился", "не допущен"]
    };

    res.status(200).json(gradeOptions);
  } catch (error) {
    console.error("Ошибка при получении возможных оценок:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};


// Серверный обработчик (API)
export const deleteGrade = async (req, res) => {
  try {
    const { studentIds, statementId, lessonId } = req.body;

    // Валидация
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: "Необходим массив studentIds" });
    }

    if (!statementId && !lessonId) {
      return res.status(400).json({ error: "Укажите statementId или lessonId" });
    }

    if (statementId && lessonId) {
      return res.status(400).json({ error: "Укажите только statementId или только lessonId" });
    }

    // Удаление оценок
    const where = {
      studentId: studentIds,
      [statementId ? 'statementId' : 'lessonId']: statementId || lessonId
    };

    const deletedCount = await Grade.destroy({ where });

    return res.status(200).json({
      success: true,
      deletedCount,
      entityType: statementId ? "statement" : "lesson"
    });

  } catch (error) {
    console.error("Ошибка при удалении оценок:", error);
    return res.status(500).json({ 
      error: "Ошибка сервера",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};