import dotenv from "dotenv";
dotenv.config();
console.log("JWT_SECRET в server.js:", process.env.JWT_SECRET);
console.log("JWT_REFRESH_SECRET  в server.js :", process.env.JWT_REFRESH_SECRET);

import express from "express";
import cors from "cors";
import router from "./src/routes/router.js"; 
import { sequelize } from "./src/models/index.js";
import { User } from "./src/models/index.js";
import bcrypt from "bcrypt";




const app = express();
app.use(cors());
app.use(express.json());

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Body:`, req.body);
    next();
});

// Все маршруты теперь идут через "/api"
app.use("/api", router);

// Функция инициализации базы данных и запуска сервера
async function initializeDatabase() {
    try {
        //await sequelize.sync({ force: true }); // Удалит и пересоздаст все таблицы

        // await sequelize.sync({ alter: true });
        // console.log("Database synced successfully");

        const saltRounds = 10;
        const adminPassword = await bcrypt.hash("1111", saltRounds);
        const teacherPassword = await bcrypt.hash("1111", saltRounds);

        await User.findOrCreate({
            where: { login: "admin" },
            defaults: {
                email: "admin@example.com",
                passwordHash: adminPassword,
                lastName: "Администратор",
                firstName: "Системный",
                patronymic: null,
                role: "Администратор",
            },
        });

        await User.findOrCreate({
            where: { login: "teacher" },
            defaults: {
                email: "teacher@example.com",
                passwordHash: teacherPassword,
                lastName: "Преподаватель",
                firstName: "Пользователь",
                patronymic: null,
                role: "Преподаватель",
            },
        });

        // Запуск сервера
        const port = process.env.PORT || 5000;
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Error syncing database:", err);
    }
}

// Запускаем сервер
initializeDatabase();
