import { Student, Group, Grade } from "../models/index.js";
import sequelize from '../config/db.js'; // Убрали фигурные скобки, так как используется default export
import { Specialty } from '../models/index.js'; // Или укажите правильный путь к файлу с моделями
// Get all students in a group
export const getStudentsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ message: "ID группы не указан" });
    }

    // Verify group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: "Группа не найдена" });
    }

    const students = await Student.findAll({
      where: { groupId: Number(groupId) },
      attributes: ["id", "lastName", "firstName", "patronymic", "groupId"],
      order: [["lastName", "ASC"]]
    });

    res.status(200).json(students);
  } catch (error) {
    console.error("Ошибка при получении студентов группы:", error);
    res.status(500).json({ 
      message: "Внутренняя ошибка сервера",
      details: error.message 
    });
  }
};

export const createStudent = async (req, res) => {
  const { studentId, lastName, firstName, patronymic, groupId } = req.body;

  try {
    // Basic validation
    if (!studentId || !lastName || !firstName || !groupId) {
      return res.status(400).json({ 
        message: "ID студента, фамилия, имя и ID группы обязательны" 
      });
    }

    // Check if student with this ID already exists
    const existingStudent = await Student.findOne({ where: { id: studentId } });
    if (existingStudent) {
      return res.status(400).json({ message: "Студент с таким ID уже существует" });
    }

    // Check group exists
    const group = await Group.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ message: "Группа не найдена" });
    }

    // Create student
    const student = await Student.create({
      id: studentId,
      lastName,
      firstName,
      patronymic: patronymic || null,
      groupId
    });

    res.status(201).json({
      message: "Студент успешно создан",
      student: {
        id: student.id,
        lastName: student.lastName,
        firstName: student.firstName,
        patronymic: student.patronymic,
        groupId: student.groupId
      }
    });

  } catch (error) {
    console.error("Ошибка при создании студента:", error);
    res.status(500).json({ 
      message: "Ошибка сервера при создании студента",
      details: error.message 
    });
  }
};

// Update student
export const updateStudent = async (req, res) => {
  const { id: oldId } = req.params;
  const { id: newId, lastName, firstName, patronymic, groupId } = req.body;

  try {
    // Находим студента по старому ID
    const student = await Student.findByPk(oldId);
    if (!student) {
      return res.status(404).json({ message: "Студент не найден" });
    }

    // Проверяем, не занят ли новый ID другим студентом (если ID изменился)
    if (newId && newId !== oldId) {
      const existingStudent = await Student.findByPk(newId);
      if (existingStudent) {
        return res.status(400).json({ message: "Студент с таким ID уже существует" });
      }
    }

    // Проверяем группу
    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(404).json({ message: "Группа не найдена" });
      }
    }

    // Если ID не меняется - просто обновляем данные
    if (newId === oldId) {
      await student.update({
        lastName,
        firstName,
        patronymic: patronymic || null,
        groupId
      });
    } else {
      // Используем raw query для изменения ID напрямую
      await Student.sequelize.query(
        'UPDATE "Cтуденты" SET "ID" = ?, "Фамилия" = ?, "Имя" = ?, "Отчество" = ?, "ID Группы" = ? WHERE "ID" = ?',
        {
          replacements: [newId, lastName, firstName, patronymic || null, groupId, oldId],
          type: Student.sequelize.QueryTypes.UPDATE
        }
      );
    }

    res.json({
      message: "Данные студента успешно обновлены",
      student: {
        id: newId,
        lastName,
        firstName,
        patronymic: patronymic || null,
        groupId
      }
    });

  } catch (error) {
    console.error("Ошибка при обновлении студента:", error);
    res.status(500).json({ 
      message: "Ошибка сервера при обновлении студента",
      details: error.message 
    });
  }
};
// Delete student
export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findByPk(id, {
      include: [{
        model: Grade,
        as: 'grades'
      }]
    });
    
    if (!student) {
      return res.status(404).json({ message: "Студент не найден" });
    }

    // Option 1: Check for grades and prevent deletion if they exist
    if (student.grades && student.grades.length > 0) {
      return res.status(400).json({ 
        message: "Невозможно удалить студента, так как у него есть оценки",
        details: {
          gradesCount: student.grades.length
        }
      });
    }

    // Option 2: Delete student with cascade (grades will be automatically deleted)
    await student.destroy();
    
    res.json({ message: "Студент успешно удален" });

  } catch (error) {
    console.error("Ошибка при удалении студента:", error);
    res.status(500).json({ 
      message: "Ошибка сервера при удалении студента",
      details: error.message 
    });
  }
};
// Check student dependencies (e.g., before deletion)
export const hasStudentDependencies = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: "Студент не найден" });
    }

    const gradesCount = await Grade.count({ where: { studentId } });
    const attendanceCount = 0; // реализуй позже, если есть посещаемость

    const hasDependencies = gradesCount > 0 || attendanceCount > 0;

    res.json({
      hasDependencies,
      details: {
        hasGrades: gradesCount > 0,
        hasAttendance: attendanceCount > 0,
        totalDependencies: gradesCount + attendanceCount
      }
    });

  } catch (error) {
    console.error("Ошибка при проверке зависимостей студента:", error);
    res.status(500).json({
      message: "Ошибка сервера при проверке зависимостей",
      details: error.message
    });
  }
};


// Get student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByPk(id, {
      attributes: ["id", "lastName", "firstName", "patronymic", "groupId"],
      include: [{
        model: Group,
        attributes: ["id", "admissionYear"],
        as: "group"
      }]
    });

    if (!student) {
      return res.status(404).json({ message: "Студент не найден" });
    }

    res.json(student);
  } catch (error) {
    console.error("Ошибка при получении данных студента:", error);
    res.status(500).json({ 
      message: "Ошибка сервера",
      details: error.message 
    });
  }
};

export const getAllStudents = async (req, res) => {
  try {
      console.log("Запрос на получение списка студентов");
      
      const { groupId, lastName } = req.query;
      const userFacultyId = req.user?.facultyId;

      const queryOptions = {
          where: {},
          include: [{
              model: Group,
              as: 'group',
              attributes: ['id', 'admissionYear'],
              include: [{
                  model: Specialty,
                  as: 'specialty',
                  attributes: ['id', 'name', 'facultyId']
              }]
          }],
          attributes: ['id', 'lastName', 'firstName', 'patronymic', 'groupId'],
          order: [['lastName', 'ASC'], ['firstName', 'ASC']],
          distinct: true
      };

      if (userFacultyId) {
          queryOptions.include[0].include[0].where = { facultyId: userFacultyId };
      }

      if (groupId) {
          queryOptions.where.groupId = groupId;
      }

      if (lastName) {
          queryOptions.where.lastName = {
              [Op.iLike]: `${lastName}%`
          };
      }

      const students = await Student.findAll(queryOptions);
      
      res.json({
          success: true,
          data: students,
          count: students.length
      });

  } catch (error) {
      console.error("Ошибка при получении списка студентов:", error);
      res.status(500).json({ 
          success: false,
          error: "Ошибка сервера",
          details: error.message 
      });
  }
};


/**
 * Получает статистику успеваемости студента за семестр
 * @param {number} studentId - ID студента
 * @param {number} semester - Номер семестра (1-10)
 * @returns {Promise<Object>} - Статистика студента за семестр
 */
export const getStudentStatistics = async (studentId, semester) => {
  const id = Number(studentId);
  const sem = Number(semester);

  if (isNaN(id) || isNaN(sem) || sem < 1 || sem > 10) {
      throw new Error('Неверный ID студента или номер семестра. Семестр должен быть числом от 1 до 10.');
  }

  try {
      // 1. Получаем данные студента
      const student = await Student.findByPk(id);
      if (!student) {
          throw new Error(`Студент с ID ${id} не найден`);
      }

      if (!student.groupId) {
          throw new Error(`У студента ${id} не указана группа`);
      }

      // 2. Получаем ведомости группы за указанный семестр
      const statements = await Statement.findAll({
          where: {
              groupId: student.groupId,
              semester: sem
          },
          include: [
              {
                  model: Lesson,
                  as: 'lessons',
                  include: [{
                      model: Grade,
                      as: 'grades',
                      where: { studentId: id },
                      required: false
                  }]
              },
              {
                  model: Grade,
                  as: 'certificationGrades',
                  where: { studentId: id },
                  required: false
              }
          ]
      });

      if (!statements.length) {
          return {
              overallAverage: null,
              attendancePercentage: null,
              certificationPercentage: null,
              certificationAverage: null,
              message: `Нет данных за ${sem} семестр`
          };
      }

      // 3. Рассчитываем статистику
      let totalGradesSum = 0;
      let totalGradesCount = 0;
      let totalPossibleAttendances = 0;
      let actualAttendances = 0;
      const certificationValues = [];
      let totalCertificationPossible = 0;
      let passedCertification = 0;

      // Обработка занятий и оценок
      for (const statement of statements) {
          for (const lesson of statement.lessons || []) {
              const grade = (lesson.grades || [])[0]; // Берем первую оценку (если есть)

              totalPossibleAttendances++;

              if (grade) {
                  if (/^[0-9]+$/.test(grade.value)) {
                      const numericValue = parseInt(grade.value);
                      totalGradesSum += numericValue;
                      totalGradesCount++;
                      actualAttendances++;
                  } else if (grade.value === 'не явился') {
                      // Пропуск занятия
                  }
              }
          }

          // Обработка аттестационных оценок
          for (const grade of statement.certificationGrades || []) {
              if (grade.value === 'зачет') {
                  certificationValues.push(1);
                  passedCertification++;
                  totalCertificationPossible++;
              } else if (grade.value === 'незачет') {
                  certificationValues.push(0);
                  totalCertificationPossible++;
              } else if (/^[0-9]+$/.test(grade.value)) {
                  const numericValue = parseInt(grade.value);
                  certificationValues.push(numericValue);
                  totalCertificationPossible++;
                  if (numericValue >= 4) {
                      passedCertification++;
                  }
              }
          }
      }

      // Расчет итоговых показателей
      const round = num => num !== null ? Math.round(num * 10) / 10 : null;

      const result = {
          overallAverage: round(totalGradesCount > 0 ? totalGradesSum / totalGradesCount : null),
          attendancePercentage: round(totalPossibleAttendances > 0 ? 
              (actualAttendances / totalPossibleAttendances) * 100 : 0),
          certificationPercentage: round(totalCertificationPossible > 0 ? 
              (passedCertification / totalCertificationPossible) * 100 : 0),
          certificationAverage: round(certificationValues.length > 0 ? 
              certificationValues.reduce((sum, val) => sum + val, 0) / certificationValues.length : null),
          semester: sem,
          studentId: id,
          groupId: student.groupId
      };

      console.log(`Статистика студента ${id} за семестр ${sem}:`, result);
      return result;

  } catch (error) {
      console.error(`Ошибка при получении статистики студента ${id} за семестр ${sem}:`, error);
      throw error;
  }
};