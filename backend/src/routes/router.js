import express from "express";
import { login, register, logout, refreshToken } from "../controllers/authController.js";

import {
    getAllStatements,
    getTeacherStatements,
    hasTeacherStatements,
    createStatement,
    updateStatement,
    deleteStatement,
    calculateAverageGrades, // Импорт нового метода
    countMissedLessons     // Импорт нового метода
} from "../controllers/statementController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

import { getAllUsers, getUserByLogin, getCurrentUser, getPossibleStatuses, getPossibleRoles } from "../controllers/userController.js";
import { getGroupById, getAllGroups } from "../controllers/groupController.js";
import { getDisciplineById, getAllDisciplines } from "../controllers/disciplineController.js";
import { getFacultyById } from "../controllers/facultyController.js";
import { getSpecialtyById } from "../controllers/specialtyController.js";
import { getStudentsByGroup } from "../controllers/studentController.js";
import { setGrade, getPossibleGrades, getGrades, deleteGrade  } from "../controllers/gradeController.js";
import { generateStatementDocument } from "../controllers/fileController.js";
import { getStatementFile } from "../controllers/fileController.js";
import { deleteUser, updateUser, createUser, getAllTeachers, changePassword } from "../controllers/userController.js";

// Импорт контроллеров для занятий
import {
    getLessonsByStatement,
    createLesson,
    updateLesson,
    deleteLesson,
    getTeacherLessons
} from "../controllers/lessonController.js";

import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Аутентификация
router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/logout", logout);
router.post("/auth/refresh", refreshToken);

// Ведомости
router.get("/statements/all", verifyToken, getAllStatements);
router.get("/statements", verifyToken, getTeacherStatements);

// Проверка наличия ведомостей у преподавателя
router.get("/statements/has-statements/:teacherLogin", verifyToken, async (req, res) => {
    try {
        const { teacherLogin } = req.params;
        const hasStatements = await hasTeacherStatements(teacherLogin);
        res.json({ hasStatements });
    } catch (error) {
        console.error("Ошибка при проверке наличия ведомостей:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
});

// Создание новой ведомости
router.post("/statements", verifyToken, createStatement);

// Изменение ведомости
router.put("/statements/:id", verifyToken, updateStatement);

// Удаление ведомости
router.delete("/statements/:id", verifyToken, deleteStatement);

// Новые маршруты для аналитики по ведомостям
router.get("/statements/:statementId/average-grades", verifyToken, async (req, res) => {
    try {
        const { statementId } = req.params;
        const averages = await calculateAverageGrades(statementId);
        res.json(averages);
    } catch (error) {
        console.error("Ошибка при расчете средних оценок:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
});

router.get("/statements/:statementId/missed-lessons", verifyToken, async (req, res) => {
    try {
        const { statementId } = req.params;
        const missedCounts = await countMissedLessons(statementId);
        res.json(missedCounts);
    } catch (error) {
        console.error("Ошибка при подсчете пропусков:", error);
        res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
});

// Занятия
router.get("/statements/:statementId/lessons", verifyToken, getLessonsByStatement);
router.post("/lessons", verifyToken, createLesson);
router.put("/lessons/:id", verifyToken, updateLesson);
router.delete("/lessons/:id", verifyToken, deleteLesson);
router.get("/teacher/lessons", verifyToken, getTeacherLessons);

// Пользователи
router.get("/users", getAllUsers);
router.get("/users/:login", getUserByLogin);
router.get("/me", verifyToken, getCurrentUser);
router.delete("/users/:login", deleteUser);
router.put("/users/:login", updateUser);
router.post("/users", createUser);
router.get("/users/all/teachers", getAllTeachers); 
// Новый маршрут для смены пароля
router.post('/users/change-password', verifyToken, changePassword);

// Получение возможных статусов и ролей
router.get("/users/statuses/possible-values", getPossibleStatuses);
router.get("/users/roles/possible-values", getPossibleRoles);
router.get("/disciplines", getAllDisciplines);

// Получение данных по ID
router.get("/groups/:id", getGroupById);
router.get("/disciplines/:id", getDisciplineById);
router.get("/faculties/:id", getFacultyById);
router.get("/specialties/:id", getSpecialtyById);

// Получение всех групп
router.get("/groups", getAllGroups);

router.get("/groups/:groupId/students", getStudentsByGroup);
// Универсальный маршрут для установки оценки
router.post("/grades/set", verifyToken, setGrade);
router.get("/grades", verifyToken, getGrades);
router.get("/grades/possible-values", getPossibleGrades);

router.delete("/grades", deleteGrade);

// Маршрут для генерации ведомости
router.post("/statements/:statementId/generate", verifyToken, async (req, res) => {
    try {
        const { statementId } = req.params;
        const pdfPath = await generateStatementDocument(statementId);
        res.status(200).json({ message: "Ведомость успешно сгенерирована", filePath: pdfPath });
    } catch (error) {
        res.status(500).json({ message: "Ошибка генерации ведомости", error: error.message });
    }
});
router.get("/statements/:statementId/file", verifyToken, getStatementFile);

export default router;