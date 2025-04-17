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

// Импорт моделей
import userModel from "./user.js";
import facultyModel from "./faculty.js";
import specialtyModel from "./specialty.js";
import groupModel from "./group.js";
import studentModel from "./student.js";
import disciplineModel from "./discipline.js";
import statementModel from "./statement.js";
import lessonModel from "./lesson.js";
import gradeModel from "./grade.js";
import journalModel from "./journal.js";
import semesterModel from "./semester.js";

// Инициализация Sequelize
// Инициализация Sequelize с явным отключением логгирования
const sequelize = new Sequelize({
  ...config.development,
  logging: false,
  benchmark: false
});
// Инициализация моделей
const User = userModel(sequelize, DataTypes);
const Faculty = facultyModel(sequelize, DataTypes);
const Specialty = specialtyModel(sequelize, DataTypes);
const Group = groupModel(sequelize, DataTypes);
const Student = studentModel(sequelize, DataTypes);
const Discipline = disciplineModel(sequelize, DataTypes);
const Statement = statementModel(sequelize, DataTypes);
const Lesson = lessonModel(sequelize, DataTypes);
const Grade = gradeModel(sequelize, DataTypes);
const Journal = journalModel(sequelize, DataTypes);
const Semester = semesterModel(sequelize, DataTypes);

// Ассоциации
Group.belongsTo(Specialty, { foreignKey: "specialtyId", as: "specialty" });
Specialty.belongsTo(Faculty, { foreignKey: "facultyId", as: "faculty" });

Statement.belongsTo(User, { foreignKey: "teacherLogin", as: "teacher" });
Statement.belongsTo(Semester, { foreignKey: "semesterId", as: "semester" });
Statement.hasMany(Grade, { foreignKey: "statementId", as: "grades", constraints: false });


Lesson.belongsTo(Journal, { foreignKey: "journalId", as: "journal" });
Lesson.hasMany(Grade, { foreignKey: "lessonId", as: "grades", constraints: false });


User.hasMany(Statement, { foreignKey: "teacherLogin", as: "statements" });

Student.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Group.hasMany(Student, { foreignKey: "groupId", as: "students" });

Grade.belongsTo(Statement, { foreignKey: "statementId", as: "statement", constraints: false });
Grade.belongsTo(Lesson, { foreignKey: "lessonId", as: "lesson", constraints: false });
Grade.belongsTo(Student, { foreignKey: "studentId", as: "student" });

// Связи с Journal
Journal.belongsTo(User, { foreignKey: "teacherLogin", as: "teacher" });
Journal.belongsTo(Semester, { foreignKey: "semesterId", as: "semester" });
Journal.hasMany(Lesson, { foreignKey: "journalId", as: "lessons" });

// Связи с Semester
Semester.hasOne(Journal, { 
  foreignKey: 'semesterId',
  as: 'journal'
});
Semester.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Semester.belongsTo(Discipline, { foreignKey: "disciplineId", as: "discipline" });
Group.hasMany(Semester, { foreignKey: "groupId", as: "semesters" });
Discipline.hasMany(Semester, { foreignKey: "disciplineId", as: "semesters" });

// Синхронизация
sequelize
  .sync({ force: false })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Error syncing database:", err));

// Экспорт
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
  Journal,
  Semester,
};
