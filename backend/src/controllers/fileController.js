import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Statement, Discipline, Faculty, Group, Specialty, Student, Grade, User } from "../models/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import validator from 'validator';
// Получаем текущую директорию файла
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const generateStatementDocument = async (statementId) => {
    try {
        console.log(`[${new Date().toISOString()}] Запуск генерации ведомости для ID: ${statementId}`);

        // Получаем ведомость с необходимыми связями
        const statement = await Statement.findByPk(statementId, {
            include: [
                { model: Discipline, as: "discipline", attributes: ["name"] },
                { 
                    model: Group, as: "group", 
                    include: [{ model: Specialty, as: "specialty", attributes: ["id", "facultyId"] }], 
                    attributes: ["id", "admissionYear", "educationForm", "educationLevel"] 
                },
                { model: User, as: "teacher", attributes: ["lastName", "firstName", "patronymic"] }
            ]
        });

        if (!statement) throw new Error(`Ведомость с ID ${statementId} не найдена`);
        if (!statement.group) throw new Error(`У ведомости ${statementId} отсутствует группа`);
        if (!statement.group.specialty) throw new Error(`У группы ${statement.group.id} отсутствует специальность`);

        console.log(`[${new Date().toISOString()}] Полученные данные statement:`, JSON.stringify(statement, null, 2));

        // Получаем специальность и факультет
        const specialty = await Specialty.findByPk(statement.group.specialty.id);
        if (!specialty) throw new Error(`Специальность с ID ${statement.group.specialty.id} не найдена`);

        const faculty = await Faculty.findByPk(specialty.facultyId);
        if (!faculty) throw new Error(`Факультет с ID ${specialty.facultyId} не найден`);

        console.log(`[${new Date().toISOString()}] Найден факультет: ${faculty.name}`);

        // Формируем корректное название факультета
        const facultyName = faculty.name.startsWith("Факультет") 
            ? faculty.name.replace(/^Факультет\s+/i, "") 
            : faculty.name;

        // Определяем учебный год (учитываем, что начинается 1 сентября)
        const currentYear = new Date().getFullYear();
        const startOfAcademicYear = new Date(currentYear, 8, 1); // 1 сентября
        const academicYearStart = new Date() < startOfAcademicYear ? currentYear - 1 : currentYear;
        const academicYear = `${academicYearStart}/${academicYearStart + 1}`;

        // Определяем ступень высшего образования
        const educationLevel = String(statement.group.educationLevel) === "1" ? "первая ступень" : "вторая ступень";

        // Определяем курс по семестру (семестр / 2)
        const courseNumber = Math.ceil(statement.semester / 2);

        // Разделяем код факультета и ведомости
        const statementCode = statement.id.toString();
        const facultyCode = specialty.facultyId.toString();
        const formattedStatementCode = statementCode.startsWith(facultyCode)
            ? `${facultyCode}/${statementCode.slice(facultyCode.length)}`
            : statementCode;

        // Получаем студентов группы и сортируем их по алфавиту (по фамилии)
        const students = await Student.findAll({
            where: { groupId: statement.groupId },
            attributes: ["id", "lastName", "firstName", "patronymic"],
            order: [['lastName', 'ASC']] // Сортировка по фамилии в алфавитном порядке
        });

        console.log(`[${new Date().toISOString()}] Найдено студентов: ${students.length}`);

        // Получаем оценки студентов
        const grades = await Grade.findAll({
            where: { statementId },
            attributes: ["studentId", "value"]
        });

        console.log(`[${new Date().toISOString()}] Найдено оценок: ${grades.length}`);

        // Формируем карту оценок
        const gradeMap = grades.reduce((acc, grade) => {
            acc[grade.studentId] = grade.value;
            return acc;
        }, {});

        console.log(`[${new Date().toISOString()}] Карта оценок:`, gradeMap);

        // Фильтруем студентов, которые не явились или не допущены
        const presentStudents = students.filter(student => {
            const grade = gradeMap[student.id];
            return grade !== "не явился" && grade !== "не допущен";
        });

        // Для зачета заменяем подсчет оценок на прочерки
        const isCredit = statement.assessmentType === "зачет";
        const gradePlaceholder = isCredit ? "—" : 0;

        // Формируем данные для шаблона
        const statementData = {
            statementNumber: formattedStatementCode,
            educationForm: statement.group.educationForm,
            educationLevel: educationLevel,
            assessmentType: statement.assessmentType,
            academicYear: academicYear,
            semester: statement.semester,
            facultyName: facultyName,
            courseNumber: courseNumber,
            groupNumber: statement.group.id,
            disciplineName: statement.discipline.name,
            practiceHours: statement.practiceHours,
            creditUnits: statement.creditUnits || 0,
            teacherName: `${statement.teacher.lastName} ${statement.teacher.firstName[0]}.` + 
                (statement.teacher.patronymic ? `${statement.teacher.patronymic[0]}.` : ""),
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

        console.log(`[${new Date().toISOString()}] Данные для генерации документа сформированы`);

        // Загружаем шаблон документа
        const templatePath = path.join(__dirname, "../../templates", "Ведомость.docx");

        if (!fs.existsSync(templatePath)) throw new Error("Шаблон ведомости не найден");

        console.log(`[${new Date().toISOString()}] Шаблон найден, начинается обработка`);

        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);

        // Заполняем шаблон данными
        doc.render(statementData);

        // Сохраняем заполненный документ
        const docxPath = path.join("uploads", `Ведомость_${statementId}.docx`);
        fs.writeFileSync(docxPath, doc.getZip().generate({ type: "nodebuffer" }));

        console.log(`[${new Date().toISOString()}] DOCX-файл сохранен: ${docxPath}`);

        // Обновляем путь к файлу в БД
        await Statement.update({ list: docxPath }, { where: { id: statementId } });

        console.log(`[${new Date().toISOString()}] Ведомость обновлена в БД, путь к файлу: ${docxPath}`);

        // Возвращаем путь к DOCX
        return docxPath;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Ошибка при генерации ведомости:`, error);
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




// Функции для шифрования/дешифрования
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Должен быть 32 байта
const IV_LENGTH = 16;

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
/**
 * Отправляет ведомость по почте через Gmail
 * @param {Object} req - Запрос
 * @param {Object} res - Ответ
 */
export const sendStatementByEmail = async (req, res) => {
    const { statementId } = req.params;
    const { 
        recipientEmails, 
        subject = 'Ведомость', 
        messageText = 'Прикреплена ведомость по дисциплине.',
        header = 'Уважаемые коллеги,' // Новое поле - заголовок письма
    } = req.body;

    try {
        // Валидация
        if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Укажите хотя бы один email получателя" 
            });
        }

        // Получаем ведомость и преподавателя
        const statement = await Statement.findOne({
            where: { id: statementId },
            include: [{
                model: User,
                as: 'teacher',
                attributes: ['email', 'emailPassword', 'firstName', 'lastName', 'patronymic'],
                foreignKey: 'teacherLogin'
            }]
        });

        if (!statement) {
            return res.status(404).json({ success: false, error: "Ведомость не найдена" });
        }

        if (!statement.teacher.email || !statement.teacher.emailPassword) {
            return res.status(400).json({ 
                success: false, 
                error: "У преподавателя не настроена почта или пароль" 
            });
        }

        if (!statement.list) {
            return res.status(400).json({ 
                success: false, 
                error: "Ведомость не содержит данных для отправки" 
            });
        }

        // Читаем файл ведомости
        const fileContent = await fs.promises.readFile(statement.list);

        // Дешифруем пароль перед использованием
        let decryptedPassword = decrypt(statement.teacher.emailPassword);

        // Формируем имя отправителя в формате "Фамилия И.О."
        const { lastName, firstName, patronymic } = statement.teacher;
        const initials = `${firstName ? firstName.charAt(0) + '.' : ''}${patronymic ? patronymic.charAt(0) + '.' : ''}`;
        const senderName = `${lastName} ${initials}`.trim();

        // Настраиваем SMTP транспортер
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
                user: statement.teacher.email,
                pass: decryptedPassword
            },
            tls: {
                rejectUnauthorized: process.env.NODE_ENV !== 'development'
            },
            logger: true,
            debug: true
        });

        // Формируем полный текст письма с заголовком
        const fullMessageText = `${header}\n\n${messageText}`;
// Получаем оригинальное имя файла из пути
const originalFileName = path.basename(statement.list);

        // Отправляем письмо
        const info = await transporter.sendMail({
            from: {
                name: senderName,
                address: statement.teacher.email
            },
            to: recipientEmails.join(', '),
            subject: subject,
            text: fullMessageText, // Используем текст с заголовком
            attachments: [{
                filename: originalFileName, // Используем оригинальное имя
                content: fileContent,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }]
        });

        // Обновляем дату отправки
        await statement.update({ date: new Date() });

        // Очищаем память от дешифрованного пароля
        decryptedPassword = null;

        res.json({
            success: true,
            message: "Ведомость успешно отправлена",
            details: {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                header: header // Возвращаем использованный заголовок в ответе
            }
        });

    } catch (error) {
        console.error("Ошибка отправки:", error);
        
        let errorMessage = "Ошибка при отправке ведомости";
        if (error.code === 'EAUTH') {
            errorMessage = "Ошибка аутентификации. Проверьте email и пароль.";
        } else if (error.code === 'ENOENT') {
            errorMessage = "Файл ведомости не найден";
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};