import { Discipline, Grade, Specialty, Statement, Faculty } from "../models/index.js";
import sequelize from '../config/db.js';
import { Op } from 'sequelize';

// Get all disciplines with faculty check
// Get all disciplines with faculty check
export const getAllDisciplines = async (req, res) => {
    try {
      const userFacultyId = req.user?.facultyId;
      
      const queryOptions = {
        attributes: ["id", "name", "facultyId", "isPractice"],
        order: [["name", "ASC"]]
      };
  
      // Add faculty filter if user has facultyId
      if (userFacultyId) {
        queryOptions.where = { facultyId: userFacultyId };
      }
  
      const disciplines = await Discipline.findAll(queryOptions);
  
      if (!disciplines || disciplines.length === 0) {
        return res.status(404).json({ error: "Дисциплины не найдены" });
      }
  
      // Возвращаем просто массив дисциплин (старый формат)
      res.json(disciplines);
      
    } catch (error) {
      console.error("Ошибка при получении дисциплин:", error);
      res.status(500).json({ 
        error: "Ошибка сервера", 
        details: error.message 
      });
    }
  };

// Get discipline by ID with faculty check
export const getDisciplineById = async (req, res) => {
  try {
    const { id } = req.params;
    const userFacultyId = req.user?.facultyId;

    const queryOptions = {
      where: { id },
      attributes: ["id", "name", "facultyId", "isPractice"],
      include: [{
        model: Faculty,
        attributes: ["id", "name"]
      }]
    };

    // Add faculty filter if user has facultyId
    if (userFacultyId) {
      queryOptions.where.facultyId = userFacultyId;
    }

    const discipline = await Discipline.findOne(queryOptions);

    if (!discipline) {
      return res.status(404).json({ 
        error: "Дисциплина не найдена или у вас нет доступа" 
      });
    }

    res.json(discipline);
  } catch (error) {
    console.error("Ошибка при получении данных дисциплины:", error);
    res.status(500).json({ 
      error: "Ошибка сервера", 
      details: error.message 
    });
  }
};

export const createDiscipline = async (req, res) => {
    const { id, name, facultyId: bodyFacultyId, isPractice = false } = req.body;
    const userFacultyId = req.user?.facultyId;

    try {
        // Определяем facultyId: берем из тела запроса или из данных пользователя
        const facultyId = bodyFacultyId || userFacultyId;
        
        // Если facultyId не определен вообще
        if (!facultyId) {
            return res.status(403).json({ 
                error: "Не указан факультет для дисциплины и у пользователя нет привязанного факультета" 
            });
        }

        // Проверяем права доступа (если пользователь привязан к факультету)
        if (userFacultyId && facultyId !== userFacultyId) {
            return res.status(403).json({ 
                error: "Нет прав на создание дисциплины для этого факультета" 
            });
        }

        // Проверяем существование дисциплины с таким ID
        if (id) {
            const existingDiscipline = await Discipline.findByPk(id);
            if (existingDiscipline) {
                return res.status(400).json({ 
                    error: "Дисциплина с таким ID уже существует" 
                });
            }
        }

        // Проверяем существование факультета
        const faculty = await Faculty.findByPk(facultyId);
        if (!faculty) {
            return res.status(404).json({ 
                error: "Факультет не найден" 
            });
        }

        // Создаем дисциплину
        const discipline = await Discipline.create({
            id,
            name,
            facultyId,
            isPractice
        });

        res.status(201).json({
            message: "Дисциплина успешно создана",
            discipline: {
                id: discipline.id,
                name: discipline.name,
                facultyId: discipline.facultyId,
                isPractice: discipline.isPractice
            }
        });
    } catch (error) {
        console.error("Ошибка при создании дисциплины:", error);
        res.status(500).json({ 
            error: "Ошибка сервера", 
            details: error.message 
        });
    }
};
  export const updateDiscipline = async (req, res) => {
    const { id: oldId } = req.params;
    const { id: newId, name, facultyId, isPractice } = req.body;
    const userFacultyId = req.user?.facultyId;

    try {
        // Find discipline
        const discipline = await Discipline.findByPk(oldId);
        if (!discipline) {
            return res.status(404).json({ 
                error: "Дисциплина не найдена" 
            });
        }

        // Check faculty access
        if (userFacultyId && discipline.facultyId !== userFacultyId) {
            return res.status(403).json({ 
                error: "Нет прав на редактирование этой дисциплины" 
            });
        }

        // Check if new ID is already taken
        if (newId && newId !== oldId) {
            const existingDiscipline = await Discipline.findByPk(newId);
            if (existingDiscipline) {
                return res.status(400).json({ 
                    error: "Дисциплина с таким ID уже существует" 
                });
            }
        }

        // Check new faculty exists
        if (facultyId && facultyId !== discipline.facultyId) {
            const faculty = await Faculty.findByPk(facultyId);
            if (!faculty) {
                return res.status(404).json({ 
                    error: "Факультет не найден" 
                });
            }
        }

        if (!newId || newId === oldId) {
            // Simple update without ID change
            await discipline.update({
                name: name || discipline.name,
                facultyId: facultyId || discipline.facultyId,
                isPractice: isPractice !== undefined ? isPractice : discipline.isPractice
            });
        } else {
            // Update with ID change using transaction
            await sequelize.transaction(async (t) => {
                await Discipline.update(
                    {
                        id: newId,
                        name: name || discipline.name,
                        facultyId: facultyId || discipline.facultyId,
                        isPractice: isPractice !== undefined ? isPractice : discipline.isPractice
                    },
                    {
                        where: { id: oldId },
                        transaction: t
                    }
                );
            });
        }

        res.json({
            message: "Данные дисциплины успешно обновлены",
            discipline: {
                id: newId || oldId,
                name: name || discipline.name,
                facultyId: facultyId || discipline.facultyId,
                isPractice: isPractice !== undefined ? isPractice : discipline.isPractice
            }
        });
    } catch (error) {
        console.error("Ошибка при обновлении дисциплины:", error);
        res.status(500).json({ 
            error: "Ошибка сервера", 
            details: error.message 
        });
    }
};

// Check discipline dependencies
export const hasDisciplineDependencies = async (req, res) => {
    const { disciplineId } = req.params;

    try {
        const discipline = await Discipline.findByPk(disciplineId);
        if (!discipline) {
            return res.status(404).json({ 
                error: "Дисциплина не найдена" 
            });
        }

        // Используем правильное имя поля из модели Statement
        const statementsCount = await Statement.count({ 
            where: sequelize.where(
                sequelize.col('Statement.ID Дисциплины'), 
                disciplineId
            )
        });

        const hasDependencies = statementsCount > 0;

        res.json({
            hasDependencies,
            details: {
                hasStatements: statementsCount > 0,
                totalDependencies: statementsCount
            }
        });
    } catch (error) {
        console.error("Ошибка при проверке зависимостей дисциплины:", error);
        res.status(500).json({
            error: "Ошибка сервера",
            details: error.message
        });
    }
};

// Delete discipline with dependencies check
export const deleteDiscipline = async (req, res) => {
    const { id } = req.params;
    const userFacultyId = req.user?.facultyId;

    try {
        const discipline = await Discipline.findByPk(id);
        if (!discipline) {
            return res.status(404).json({ 
                error: "Дисциплина не найдена" 
            });
        }

        // Check faculty access
        if (userFacultyId && discipline.facultyId !== userFacultyId) {
            return res.status(403).json({ 
                error: "Нет прав на удаление этой дисциплины" 
            });
        }

        // Проверяем зависимости через правильное имя поля
        const statementsCount = await Statement.count({
            where: sequelize.where(
                sequelize.col('Statement.ID Дисциплины'), 
                id
            )
        });

        if (statementsCount > 0) {
            return res.status(400).json({ 
                error: "Невозможно удалить дисциплину, так как у неё есть связанные ведомости",
                details: {
                    statementsCount
                }
            });
        }

        await discipline.destroy();
        
        res.json({ 
            message: "Дисциплина успешно удалена" 
        });
    } catch (error) {
        console.error("Ошибка при удалении дисциплины:", error);
        res.status(500).json({ 
            error: "Ошибка сервера", 
            details: error.message 
        });
    }
};