import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Statement, Semester, Discipline, Faculty, Group, Specialty, Student, Grade, User } from "../models/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const generateStatementDocument = async (statementId) => {
    try {
        console.log(`[${new Date().toISOString()}] Генерация ведомости ID: ${statementId}`);

        const statement = await Statement.findByPk(statementId, {
            include: [
                { model: Semester, as: "semester" }
            ]
        });

        if (!statement) throw new Error(`Ведомость с ID ${statementId} не найдена`);

        const semester = await Semester.findByPk(statement.semesterId, {
            include: [
                { model: Group, as: "group", include: [{ model: Specialty, as: "specialty" }] },
                { model: Discipline, as: "discipline" }
            ]
        });

        if (!semester) throw new Error(`Семестр с ID ${statement.semesterId} не найден`);
        if (!semester.group || !semester.group.specialty) throw new Error("Недостаточно данных о группе/специальности");

        const faculty = await Faculty.findByPk(semester.group.specialty.facultyId);
        if (!faculty) throw new Error(`Факультет с ID ${semester.group.specialty.facultyId} не найден`);

        const teacher = await User.findByPk(statement.teacherLogin);
        if (!teacher) throw new Error(`Преподаватель с логином ${statement.teacherLogin} не найден`);

        const facultyName = faculty.name.replace(/^Факультет\s+/i, "");

        const currentYear = new Date().getFullYear();
        const academicYearStart = new Date() < new Date(currentYear, 8, 1) ? currentYear - 1 : currentYear;
        const academicYear = `${academicYearStart}/${academicYearStart + 1}`;
        const educationLevel = semester.group.educationLevel === 1 ? "первая ступень" : "вторая ступень";
        const courseNumber = Math.ceil(semester.semester / 2);

        const statementCode = statement.id.toString();
        const facultyCode = semester.group.specialty.facultyId.toString();
        const formattedStatementCode = statementCode.startsWith(facultyCode)
            ? `${facultyCode}/${statementCode.slice(facultyCode.length)}`
            : statementCode;

        const students = await Student.findAll({
            where: { groupId: semester.groupId },
            attributes: ["id", "lastName", "firstName", "patronymic"],
            order: [["lastName", "ASC"]]
        });

        const grades = await Grade.findAll({
            where: { statementId },
            attributes: ["studentId", "value"]
        });

        const gradeMap = grades.reduce((acc, grade) => {
            acc[grade.studentId] = grade.value;
            return acc;
        }, {});

        const isCredit = statement.assessmentType === "зачет";

        const presentStudents = students.filter(student => {
            const grade = gradeMap[student.id];
            return grade !== "не явился" && grade !== "не допущен";
        });

        const statementData = {
            statementNumber: formattedStatementCode,
            educationForm: semester.group.educationForm,
            educationLevel: educationLevel,
            assessmentType: statement.assessmentType,
            academicYear: academicYear,
            semester: semester.semester,
            facultyName: facultyName,
            courseNumber: courseNumber,
            groupNumber: semester.group.id,
            disciplineName: semester.discipline.name,
            practiceHours: semester.hours,
            creditUnits: semester.creditUnits,
            teacherName: `${teacher.lastName} ${teacher.firstName[0]}.` + 
                         (teacher.patronymic ? `${teacher.patronymic[0]}.` : ""),
            examDate: new Date().toLocaleDateString(),
            students: students.map((student, index) => {
                const grade = gradeMap[student.id] || "—";
                return {
                    index: index + 1,
                    studentName: `${student.lastName} ${student.firstName[0]}.` +
                        (student.patronymic ? `${student.patronymic[0]}.` : ""),
                    studentNumber: student.id,
                    passMark: isCredit &&
                              ["зачтено", "не зачтено", "не явился", "не допущен"].includes(grade) ? grade : "",
                    examMark: !isCredit &&
                              ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "не явился", "не допущен"].includes(grade) ? grade : ""
                };
            }),
            presentStudents: presentStudents.length,
            absentStudents: grades.filter(g => g.value === "не явился" || g.value === "не допущен").length,
            grade10: isCredit ? "—" : grades.filter(g => g.value === "10").length,
            grade9: isCredit ? "—" : grades.filter(g => g.value === "9").length,
            grade8: isCredit ? "—" : grades.filter(g => g.value === "8").length,
            grade7: isCredit ? "—" : grades.filter(g => g.value === "7").length,
            grade6: isCredit ? "—" : grades.filter(g => g.value === "6").length,
            grade5: isCredit ? "—" : grades.filter(g => g.value === "5").length,
            grade4: isCredit ? "—" : grades.filter(g => g.value === "4").length,
            grade3: isCredit ? "—" : grades.filter(g => g.value === "3").length,
            grade2: isCredit ? "—" : grades.filter(g => g.value === "2").length,
            grade1: isCredit ? "—" : grades.filter(g => g.value === "1").length,
            deanName: `${faculty.deanFirstName[0]}.` +
                      (faculty.deanPatronymic ? `${faculty.deanPatronymic[0]}. ` : " ") +
                      `${faculty.deanLastName}`
        };

        const templatePath = path.join(__dirname, "../../templates", "Ведомость.docx");
        if (!fs.existsSync(templatePath)) throw new Error("Шаблон ведомости не найден");

        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);
        doc.render(statementData);

        const docxPath = path.join("uploads", `Ведомость_${statementId}.docx`);
        fs.writeFileSync(docxPath, doc.getZip().generate({ type: "nodebuffer" }));

        await Statement.update({ list: docxPath }, { where: { id: statementId } });

        return docxPath;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Ошибка генерации:`, error);
        throw new Error("Ошибка генерации ведомости");
    }
};

export const getStatementFile = async (req, res) => {
    try {
        const { statementId } = req.params;
        const statement = await Statement.findByPk(statementId);
        
        if (!statement) {
            res.status(404).setHeader('Content-Type', 'text/plain');
            return res.send("Ведомость не найдена в базе данных");
        }

        if (!statement.list) {
            res.status(404).setHeader('Content-Type', 'text/plain');
            return res.send("Файл ведомости не указан в базе данных");
        }

        const filePath = path.join(__dirname, "..", "..", statement.list);
        
        if (!fs.existsSync(filePath)) {
            // Удаляем путь к файлу из базы данных, так как файл не существует
            await Statement.update(
                { list: null },
                { where: { id: statementId } }
            );
            
            res.status(404).setHeader('Content-Type', 'text/plain');
            return res.send("Файл ведомости не найден на сервере");
        }

        const safeFilename = `Ведомость_${statementId}.docx`.replace(/[^\w.-]/g, '_');
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);

        const file = fs.createReadStream(filePath);
        file.pipe(res);
    } catch (error) {
        console.error(`Ошибка при получении файла ведомости:`, error);
        res.status(500).setHeader('Content-Type', 'text/plain');
        res.send("Внутренняя ошибка сервера при получении файла");
    }
};