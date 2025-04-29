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







import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

/**
 * Конвертирует DOCX в PDF с использованием Microsoft Print to PDF
 * @param {string} docxPath - Путь к исходному DOCX файлу
 * @returns {Promise<string>} Путь к созданному PDF файлу
 */
const convertDocxToPdf = async (docxPath) => {
    console.log(`[CONVERT] Начало конвертации DOCX в PDF: ${docxPath}`);
    
    // Создаем папку templates, если ее нет
    const templatesDir = path.join(__dirname, '..', '..', 'templates');
    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    const pdfFilename = path.basename(docxPath).replace(/\.docx$/, '.pdf');
    const pdfPath = path.join(templatesDir, pdfFilename);
    
    try {
        if (!fs.existsSync(docxPath)) {
            throw new Error(`Исходный DOCX файл не найден по пути: ${docxPath}`);
        }

        console.log(`[CONVERT] Создаем команду PowerShell для конвертации`);
        const command = `powershell -Command "$word = New-Object -ComObject Word.Application; ` +
                       `$doc = $word.Documents.Open('${docxPath.replace(/\\/g, '\\\\')}'); ` +
                       `$doc.ExportAsFixedFormat('${pdfPath.replace(/\\/g, '\\\\')}', 17); ` +
                       `$doc.Close(); $word.Quit()"`;
        
        console.log(`[CONVERT] Выполняем команду PowerShell`);
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr) {
            console.error(`[CONVERT] Ошибка в stderr: ${stderr}`);
        }

        console.log(`[CONVERT] Проверяем существование PDF файла: ${pdfPath}`);
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF файл не был создан по пути: ${pdfPath}`);
        }

        console.log(`[CONVERT] Конвертация успешно завершена`);
        return pdfPath;
    } catch (error) {
        console.error(`[CONVERT] Ошибка конвертации:`, error);
        if (fs.existsSync(pdfPath)) {
            console.log(`[CONVERT] Удаляем частично созданный PDF файл`);
            fs.unlinkSync(pdfPath);
        }
        throw error;
    }
};

const cleanupPdfFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            console.log(`[CLEANUP] Удаляем временный PDF файл: ${filePath}`);
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(`[CLEANUP] Ошибка при удалении файла: ${error}`);
        }
    }
};

export const getStatementFile = async (req, res) => {
    console.log(`[GET FILE] Запрос файла ведомости: ${req.params.statementId}`);
    console.log(`[GET FILE] Параметры запроса:`, req.query);
    
    let tempPdfPath = null;
    
    try {
        const { statementId } = req.params;
        const { convertToPdf } = req.query;
        
        console.log(`[GET FILE] Ищем ведомость в БД: ${statementId}`);
        const statement = await Statement.findByPk(statementId);
        
        if (!statement) {
            console.error(`[GET FILE] Ведомость не найдена: ${statementId}`);
            return res.status(404).setHeader('Content-Type', 'text/plain')
                      .send("Ведомость не найдена в базе данных");
        }

        if (!statement.list) {
            console.error(`[GET FILE] Путь к файлу не указан для ведомости: ${statementId}`);
            return res.status(404).setHeader('Content-Type', 'text/plain')
                      .send("Файл ведомости не указан в базе данных");
        }

        let filePath = path.join(__dirname, "..", "..", statement.list);
        let isPdf = false;
        
        console.log(`[GET FILE] Проверяем существование файла: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            console.error(`[GET FILE] Файл не найден на сервере: ${filePath}`);
            await Statement.update({ list: null }, { where: { id: statementId } });
            return res.status(404).setHeader('Content-Type', 'text/plain')
                      .send("Файл ведомости не найден на сервере");
        }

        // Конвертация в PDF если требуется
        if (convertToPdf && convertToPdf.toLowerCase() === 'true') {
            console.log(`[GET FILE] Запрошена конвертация в PDF`);
            try {
                tempPdfPath = await convertDocxToPdf(filePath);
                if (fs.existsSync(tempPdfPath)) {
                    console.log(`[GET FILE] PDF успешно создан: ${tempPdfPath}`);
                    filePath = tempPdfPath;
                    isPdf = true;
                } else {
                    console.error(`[GET FILE] PDF файл не создан после конвертации`);
                }
            } catch (error) {
                console.error(`[GET FILE] Ошибка конвертации, используем DOCX:`, error);
            }
        } else {
            console.log(`[GET FILE] Конвертация в PDF не запрошена`);
        }

        const ext = isPdf ? 'pdf' : 'docx';
        const safeFilename = `Ведомость_${statementId}.${ext}`.replace(/[^\w.-]/g, '_');
        
        console.log(`[GET FILE] Отправка файла: ${filePath}`);
        console.log(`[GET FILE] Формат файла: ${ext}`);
        console.log(`[GET FILE] Имя файла: ${safeFilename}`);
        
        res.setHeader("Content-Type", 
            isPdf ? "application/pdf" 
                  : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        // Удаляем временный PDF файл после завершения отправки
        fileStream.on('end', () => {
            if (tempPdfPath) {
                cleanupPdfFile(tempPdfPath);
            }
        });
        
    } catch (error) {
        console.error(`[GET FILE] Критическая ошибка:`, error);
        if (tempPdfPath) {
            cleanupPdfFile(tempPdfPath);
        }
        res.status(500).setHeader('Content-Type', 'text/plain')
           .send("Внутренняя ошибка сервера при получении файла");
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
        header = 'Уважаемые коллеги,',
        convertToPdf = false
    } = req.body;

    let tempPdfPath = null;

    try {
        if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Укажите хотя бы один email получателя" 
            });
        }

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

        let filePath = path.join(__dirname, "..", "..", statement.list);
        let fileName = path.basename(filePath);
        let fileContent, contentType;

        // Конвертация в PDF если требуется
        if (convertToPdf) {
            try {
                tempPdfPath = await convertDocxToPdf(filePath);
                fileContent = await fs.promises.readFile(tempPdfPath);
                fileName = fileName.replace(/\.docx$/, '.pdf');
                contentType = 'application/pdf';
            } catch (error) {
                console.error('Ошибка конвертации, отправляю оригинальный DOCX', error);
                fileContent = await fs.promises.readFile(filePath);
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            }
        } else {
            fileContent = await fs.promises.readFile(filePath);
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        // Дешифруем пароль и отправляем письмо
        let decryptedPassword = decrypt(statement.teacher.emailPassword);
        
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
            }
        });

        const { lastName, firstName, patronymic } = statement.teacher;
        const initials = `${firstName ? firstName.charAt(0) + '.' : ''}${patronymic ? patronymic.charAt(0) + '.' : ''}`;
        const senderName = `${lastName} ${initials}`.trim();

        const info = await transporter.sendMail({
            from: { name: senderName, address: statement.teacher.email },
            to: recipientEmails.join(', '),
            subject: subject,
            text: `${header}\n\n${messageText}`,
            attachments: [{
                filename: fileName,
                content: fileContent,
                contentType: contentType
            }]
        });

        await statement.update({ date: new Date() });
        decryptedPassword = null;

        res.json({
            success: true,
            message: "Ведомость успешно отправлена",
            details: {
                format: convertToPdf ? 'PDF' : 'DOCX',
                messageId: info.messageId
            }
        });

    } catch (error) {
        console.error("Ошибка отправки:", error);
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : "Ошибка при отправке ведомости"
        });
    } finally {
        // Удаляем временный PDF файл после отправки
        if (tempPdfPath) {
            cleanupPdfFile(tempPdfPath);
        }
    }
};