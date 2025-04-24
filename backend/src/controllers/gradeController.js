import { Grade, Statement, Lesson, Student } from "../models/index.js";

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

export const setGrade = async (req, res) => {
  console.log('Начало обработки запроса на установку оценки:', {
    params: req.params,
    body: req.body,
    user: req.user?.id
  });

  try {
    const { studentId, statementId, lessonId, value } = req.body;

    // Валидация входных данных
    if (!studentId) {
      console.error('Ошибка валидации: отсутствует ID студента');
      return res.status(400).json({ error: "ID студента обязателен" });
    }

    if (!statementId && !lessonId) {
      console.error('Ошибка валидации: не указана ведомость или занятие');
      return res.status(400).json({ error: "Укажите ID ведомости или занятия" });
    }

    if (statementId && lessonId) {
      console.error('Ошибка валидации: указаны и ведомость и занятие');
      return res.status(400).json({ error: "Оценка может быть связана только с ведомостью ИЛИ только с занятием" });
    }

    if (!value) {
      console.error('Ошибка валидации: отсутствует значение оценки');
      return res.status(400).json({ error: "Оценка обязательна" });
    }

    // Нормализация значения оценки
    const normalizedValue = String(value).trim().toLowerCase();
    const validGrades = [
      "зачтено", "не зачтено", "не явился", "не допущен",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
    ];

    if (!validGrades.includes(normalizedValue)) {
      console.error('Ошибка валидации: некорректное значение оценки', normalizedValue);
      return res.status(400).json({ error: "Некорректное значение оценки" });
    }

    // Проверка существования связанных сущностей
    console.log('Проверка существования студента и сущности...');
    const [relatedEntity, student] = await Promise.all([
      statementId 
        ? Statement.findByPk(statementId) 
        : Lesson.findByPk(lessonId),
      Student.findByPk(studentId)
    ]);

    if (!relatedEntity) {
      console.error('Связанная сущность не найдена:', 
        statementId ? `Ведомость ID ${statementId}` : `Занятие ID ${lessonId}`);
      return res.status(404).json({ 
        error: statementId ? "Ведомость не найдена" : "Занятие не найдено" 
      });
    }

    if (!student) {
      console.error('Студент не найден:', studentId);
      return res.status(404).json({ error: "Студент не найден" });
    }

    // Поиск существующей оценки
    const whereCondition = { 
      studentId,
      ...(statementId ? { statementId } : { lessonId })
    };

    console.log('Поиск существующей оценки с условиями:', whereCondition);
    const existingGrade = await Grade.findOne({ where: whereCondition });

    // Подготовка данных для сохранения/обновления
    const gradeData = {
      studentId,
      value: normalizedValue,
      ...(statementId ? { statementId } : { lessonId })
    };

    let result;
    if (existingGrade) {
      // Обновление существующей оценки
      console.log('Обновление существующей оценки ID:', existingGrade.id);
      result = await existingGrade.update(gradeData);
      console.log('Оценка успешно обновлена:', {
        gradeId: result.id,
        studentId: result.studentId,
        value: result.value
      });
    } else {
      // Создание новой оценки
      console.log('Создание новой оценки');
      result = await Grade.create(gradeData);
      console.log('Новая оценка создана:', {
        gradeId: result.id,
        studentId: result.studentId,
        value: result.value
      });
    }

    return res.status(existingGrade ? 200 : 201).json({
      message: existingGrade ? "Оценка обновлена" : "Оценка создана",
      grade: result,
      entityType: statementId ? "statement" : "lesson"
    });

  } catch (error) {
    console.error("Критическая ошибка при установке оценки:", error);
    return res.status(500).json({ 
      error: "Ошибка сервера",
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