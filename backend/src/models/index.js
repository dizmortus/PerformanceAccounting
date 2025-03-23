// models/index.js
import { Sequelize, DataTypes } from "sequelize";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Получаем путь к текущему файлу
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем JSON-файл
const configPath = join(__dirname, "../config/config.json");
const config = JSON.parse(await readFile(configPath, "utf-8"));

import userModel from "./user.js";
import facultyModel from "./faculty.js";
import specialtyModel from "./specialty.js";
import groupModel from "./group.js";
import studentModel from "./student.js";
import disciplineModel from "./discipline.js";
import statementModel from "./statement.js";
import gradeModel from "./grade.js";

const sequelize = new Sequelize(config.development);

const User = userModel(sequelize, DataTypes);
const Faculty = facultyModel(sequelize, DataTypes);
const Specialty = specialtyModel(sequelize, DataTypes);
const Group = groupModel(sequelize, DataTypes);
const Student = studentModel(sequelize, DataTypes);
const Discipline = disciplineModel(sequelize, DataTypes);
const Statement = statementModel(sequelize, DataTypes);
const Grade = gradeModel(sequelize, DataTypes);

// Ассоциации
Group.belongsTo(Specialty, { foreignKey: "specialtyId", as: "specialty" });
Specialty.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });

Statement.belongsTo(Discipline, { foreignKey: "disciplineId", as: "discipline" });
Statement.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Statement.belongsTo(User, { foreignKey: "teacherLogin", as: "teacher" });
Statement.hasMany(Grade, { foreignKey: "statementId", as: "grades" });

Discipline.hasMany(Statement, { foreignKey: "disciplineId", as: "statements" });
Group.hasMany(Statement, { foreignKey: "groupId", as: "statements" });
User.hasMany(Statement, { foreignKey: "teacherLogin", as: "statements" });
// Связь Student → Group (Каждый студент принадлежит группе)
Student.belongsTo(Group, { foreignKey: "groupId", as: "group" });

// Связь Group → Student (Группа содержит множество студентов)
Group.hasMany(Student, { foreignKey: "groupId", as: "students" });



sequelize
  .sync({ force: false })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Error syncing database:", err));

// Используем именованный экспорт
export {
  sequelize,
  Sequelize,
  User,
  Faculty,
  Specialty,
  Group,
  Student,
  Discipline,
  Statement,
  Grade,
};
