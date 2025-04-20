import express from "express";
import { login, register, logout, refreshToken } from "../controllers/authController.js";

import {
    getAllStatements,
    getTeacherStatements,
    hasTeacherStatements,
    createStatement,
    updateStatement,
    deleteStatement,
    calculateAverageGrades,
    countMissedLessons,
    getStatementByGroupDisciplineSemester
} from "../controllers/statementController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

import { 
    getAllUsers, 
    getUserByLogin, 
    getCurrentUser, 
    getPossibleStatuses, 
    getPossibleRoles,
    deleteUser, 
    updateUser, 
    createUser, 
    getAllTeachers, 
    changePassword 
} from "../controllers/userController.js";

import { 
    getGroupById, 
    getAllGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    hasGroupDependencies 
} from '../controllers/groupController.js';

import { 
    getDisciplineById, 
    getAllDisciplines 
} from "../controllers/disciplineController.js";

import { 
    getFacultyById 
} from "../controllers/facultyController.js";

import { 
    getSpecialtyById,
    getAllSpecialties  // Добавлен импорт нового метода
} from "../controllers/specialtyController.js";

import {
    getStudentsByGroup,
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    hasStudentDependencies
} from "../controllers/studentController.js";

import { 
    setGrade, 
    getPossibleGrades, 
    getGrades, 
    deleteGrade  
} from "../controllers/gradeController.js";

import { 
    generateStatementDocument,
    getStatementFile 
} from "../controllers/fileController.js";

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

// Students routes
router.get("/students", verifyToken, getAllStudents);
router.get("/students/:id", verifyToken, getStudentById);
router.get("/groups/:groupId/students", verifyToken, getStudentsByGroup);
router.post("/students", verifyToken, createStudent);
router.put("/students/:id", verifyToken, updateStudent);
router.delete("/students/:id", verifyToken, deleteStudent);
router.get("/students/:studentId/has-dependencies", verifyToken, hasStudentDependencies);

// Ведомости
router.get("/statements/all", verifyToken, getAllStatements);
router.get("/statements", verifyToken, getTeacherStatements);
router.get('/statements/group/:groupId/discipline/:disciplineId/semester/:semester', 
    getStatementByGroupDisciplineSemester);

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

// Создание, изменение, удаление ведомостей
router.post("/statements", verifyToken, createStatement);
router.put("/statements/:id", verifyToken, updateStatement);
router.delete("/statements/:id", verifyToken, deleteStatement);

// Аналитика по ведомостям
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
router.get("/users", verifyToken, getAllUsers);
router.get("/users/:login", getUserByLogin);
router.get("/me", verifyToken, getCurrentUser);
router.delete("/users/:login", verifyToken, deleteUser);
router.put("/users/:login", verifyToken, updateUser);
router.post("/users", verifyToken, createUser);
router.get("/users/all/teachers", verifyToken, getAllTeachers);
router.post('/users/change-password', verifyToken, changePassword);

// Получение возможных статусов и ролей
router.get("/users/statuses/possible-values", getPossibleStatuses);
router.get("/users/roles/possible-values", getPossibleRoles);

// Дисциплины
router.get("/disciplines", getAllDisciplines);
router.get("/disciplines/:id", getDisciplineById);

// Группы
router.get("/groups",verifyToken, getAllGroups);  // Получение всех групп
router.get("/groups/:id", getGroupById);
router.get("/groups/:groupId/students", getStudentsByGroup);
router.post('/groups', verifyToken, createGroup);
router.put('/groups/:id', verifyToken, updateGroup);
router.delete('/groups/:id', verifyToken, deleteGroup);
router.get("/groups/:groupId/has-dependencies", verifyToken, hasGroupDependencies);

// Специальности
router.get("/specialties",verifyToken, getAllSpecialties);  // Добавлен новый маршрут для всех специальностей
router.get("/specialties/:id", getSpecialtyById);

// Факультеты
router.get("/faculties/:id", getFacultyById);

// Оценки
router.post("/grades/set", verifyToken, setGrade);
router.get("/grades", verifyToken, getGrades);
router.get("/grades/possible-values", getPossibleGrades);
router.delete("/grades", deleteGrade);

// Генерация ведомостей
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