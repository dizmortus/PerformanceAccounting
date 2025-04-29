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
import lessonModel from "./lesson.js";
import gradeModel from "./grade.js";

const sequelize = new Sequelize(config.development);

const User = userModel(sequelize, DataTypes);
const Faculty = facultyModel(sequelize, DataTypes);
const Specialty = specialtyModel(sequelize, DataTypes);
const Group = groupModel(sequelize, DataTypes);
const Student = studentModel(sequelize, DataTypes);
const Discipline = disciplineModel(sequelize, DataTypes);
const Statement = statementModel(sequelize, DataTypes);
const Lesson = lessonModel(sequelize, DataTypes);
const Grade = gradeModel(sequelize, DataTypes);

// Основные ассоциации
Student.hasMany(Grade, { foreignKey: 'studentId', as: 'grades' });
Grade.belongsTo(Student, { foreignKey: 'studentId' });

// Ассоциации групп и специальностей
Group.belongsTo(Specialty, { foreignKey: "specialtyId", as: "specialty" });
Specialty.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });

// Ассоциации факультетов
Discipline.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });
User.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });

// Обратные связи факультетов
Faculty.hasMany(Discipline, { foreignKey: "facultyId", as: "disciplines" });
Faculty.hasMany(User, { foreignKey: "facultyId", as: "users" });

// Связи ведомостей
Statement.belongsTo(Discipline, {
  foreignKey: 'disciplineId',
  as: 'discipline',
  onUpdate: 'CASCADE',
});

Statement.belongsTo(Group, {
  foreignKey: 'groupId',
  as: 'group',
  onUpdate: 'CASCADE',
});

Statement.belongsTo(User, {
  foreignKey: 'teacherLogin',
  as: 'teacher',
  onUpdate: 'CASCADE',
});

Statement.belongsTo(User, {
  foreignKey: 'classTeacherLogin',
  as: 'classTeacher',
  onUpdate: 'CASCADE',
});

Statement.hasMany(Grade, { 
  foreignKey: "statementId", 
  as: "grades",
  constraints: false
});

Statement.hasMany(Lesson, { 
  foreignKey: "statementId", 
  as: "lessons" 
});

// Связи занятий
Lesson.belongsTo(Statement, { 
  foreignKey: "statementId", 
  as: "statement" 
});

Lesson.hasMany(Grade, {
  foreignKey: "lessonId",
  as: "grades",
  constraints: false
});

// Обратные связи
Discipline.hasMany(Statement, { 
  foreignKey: "disciplineId", 
  as: "disciplineStatements" // Измененный псевдоним
});

Group.hasMany(Statement, { 
  foreignKey: "groupId", 
  as: "groupStatements" // Измененный псевдоним
});

// Ассоциации пользователей (перенесены в одно место)
User.hasMany(Statement, { 
  foreignKey: "teacherLogin", 
  as: "teacherStatements" // Измененный псевдоним
});

User.hasMany(Statement, { 
  foreignKey: "classTeacherLogin", 
  as: "classTeacherStatements" 
});

// Связи студентов
Student.belongsTo(Group, { 
  foreignKey: "groupId", 
  as: "group" 
});

Group.hasMany(Student, { 
  foreignKey: "groupId", 
  as: "students" 
});

// Связи оценок
Grade.belongsTo(Statement, { 
  foreignKey: "statementId", 
  as: "statement",
  constraints: false
});

Grade.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
  constraints: false
});

Grade.belongsTo(Student, { 
  foreignKey: "studentId", 
  as: "student" 
});

// Scope для пользователя с занятиями
User.addScope('withLessons', {
  include: [{
      model: Lesson,
      as: 'lessons'
  }]
});

sequelize
  .sync({ force: false })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Error syncing database:", err));

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
  Lesson,
  Grade,
};