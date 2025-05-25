import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Statement, Discipline, Faculty, Group, Specialty, Student, Grade, User } from "../models/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createStudent } from "../controllers/studentController.js";
import {  createGroup, calculateGroupStatistics} from "../controllers/groupController.js";
import { createStatement} from "../controllers/statementController.js";
import {createDiscipline } from "../controllers/disciplineController.js";
import { createUser } from "../controllers/userController.js";
import validator from 'validator';
import excel from 'exceljs';
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

        // Получаем специальность и факультет с деканом
        const specialty = await Specialty.findByPk(statement.group.specialty.id);
        if (!specialty) throw new Error(`Специальность с ID ${statement.group.specialty.id} не найдена`);

        const faculty = await Faculty.findByPk(specialty.facultyId, {
            include: [{
                model: User,
                as: "dean",
                attributes: ["lastName", "firstName", "patronymic"]
            }]
        });
        if (!faculty) throw new Error(`Факультет с ID ${specialty.facultyId} не найден`);
        if (!faculty.dean) throw new Error(`Декан не назначен для факультета ${faculty.name}`);

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
            deanName: `${faculty.dean.lastName} ${faculty.dean.firstName[0]}.` + 
                      (faculty.dean.patronymic ? `${faculty.dean.patronymic[0]}.` : "")
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

        // await statement.update({ date: new Date() });
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

export const importEntitiesFromExcel = async (req, res) => {
  if (!req.file) {
    console.warn(`[${new Date().toISOString()}] Загрузка файла не выполнена`);
    return res.status(400).json({ error: "Файл не был загружен" });
  }

  const { entityType } = req.params;

  if (!['student', 'group', 'discipline', 'statement', 'user'].includes(entityType)) {
    console.warn(`[${new Date().toISOString()}] Неподдерживаемый тип сущности: ${entityType}`);
    return res.status(400).json({ error: "Неподдерживаемый тип сущности" });
  }

  console.log(`[${new Date().toISOString()}] Начат импорт сущностей типа: ${entityType}`);

  try {
    const workbook = new excel.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const entitiesToImport = [];
    const errors = [];
    let successCount = 0;

    const columnMapping = {
      student: {
        studentId: 1, lastName: 2, firstName: 3, patronymic: 4, groupId: 5
      },
      discipline: {
        id: 1, name: 2, isPractice: 3
      },
      statement: {
        assessmentType: 1,disciplineId: 2, groupId: 3,semester: 4, teacherLogin: 5, classTeacherLogin: 6, date: 7, 
        practiceHours: 8,   creditUnits: 9
      },
      user: {
        login: 1, lastName: 2, firstName: 3,
        patronymic: 4,  email: 5, role: 6,password: 7, status: 8, isDean: 9
      },
      group: {
        id: 1, specialtyId: 2, admissionYear: 3, educationForm: 4, educationLevel: 5
      }
    };

    console.log(`[${new Date().toISOString()}] Чтение строк из Excel...`);
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const entityData = {};
        const mapping = columnMapping[entityType];

        for (const [field, col] of Object.entries(mapping)) {
          let value = row.getCell(col).value;

          if ((field === 'studentId' || field === 'groupId' || field === 'id') && value) {
            value = Number(value);
            if (isNaN(value)) {
              throw new Error(`Поле ${field} должно быть числом`);
            }
          }

          entityData[field] = value;
        }

        entitiesToImport.push(entityData);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Ошибка при чтении строки ${rowNumber}: ${error.message}`);
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row.values
        });
      }
    });

    console.log(`[${new Date().toISOString()}] Обнаружено записей для импорта: ${entitiesToImport.length}`);

    for (const [index, entityData] of entitiesToImport.entries()) {
      try {
        if (entityType === 'student') {
          if (!entityData.studentId || !entityData.lastName || !entityData.firstName || !entityData.groupId) {
            throw new Error("Отсутствуют обязательные поля");
          }
        }

        const mockReq = {
          body: entityData,
          user: req.user
        };

        await new Promise((resolve, reject) => {
          const mockRes = {
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              if (this.statusCode >= 400) {
                reject(new Error(data.message || data.error || "Ошибка при создании"));
              } else {
                resolve(data);
              }
            }
          };

          switch (entityType) {
            case 'student':
              createStudent(mockReq, mockRes).catch(reject);
              break;
            case 'discipline':
              createDiscipline(mockReq, mockRes).catch(reject);
              break;
            case 'statement':
              createStatement(mockReq, mockRes).catch(reject);
              break;
            case 'user':
              createUser(mockReq, mockRes).catch(reject);
              break;
            case 'group':
              createGroup(mockReq, mockRes).catch(reject);
              break;
          }
        });

        console.log(`[${new Date().toISOString()}] Импортирована запись ${index + 2}: ${JSON.stringify(entityData)}`);
        successCount++;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Ошибка при импорте строки ${index + 2}: ${error.message}`);
        errors.push({
          row: index + 2,
          error: error.message,
          data: entityData
        });
      }
    }

    console.log(`[${new Date().toISOString()}] Импорт завершен. Успешно: ${successCount}, С ошибками: ${errors.length}`);

    res.status(200).json({
      message: "Импорт завершен",
      entityType,
      importedCount: successCount,
      errorCount: errors.length,
      errors: errors,
      success: successCount === entitiesToImport.length
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при импорте ${entityType}:`, error);
    res.status(500).json({
      error: "Ошибка сервера",
      details: error.message
    });
  }
};
export const exportGroupStatisticsToExcel = async (req, res) => {
  const { groupId } = req.params;
  const { semester, statementId } = req.query;

  if (!groupId) {
    console.warn(`[${new Date().toISOString()}] Не указан ID группы`);
    return res.status(400).json({ error: "Не указан ID группы" });
  }

  console.log(`[${new Date().toISOString()}] Начато формирование статистики для группы ID: ${groupId}, семестр: ${semester || 'не указан'}, ведомость: ${statementId || 'не указана'}`);

  try {
    // 1. Получаем статистику по группе
    console.log(`[${new Date().toISOString()}] Получение статистики по группе...`);
    const statistics = await calculateGroupStatistics(groupId, semester, statementId);
    console.log(`[${new Date().toISOString()}] Статистика успешно получена. Кол-во студентов: ${statistics.students.length}`);

    if (!statistics.students.length) {
      console.warn(`[${new Date().toISOString()}] Нет данных для экспорта по группе ${groupId}`);
      return res.status(404).json({ error: "Нет данных для экспорта" });
    }

    // 2. Создаем новую книгу Excel
    console.log(`[${new Date().toISOString()}] Создание Excel-файла...`);
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Статистика группы');

    // 3. Определяем заголовки столбцов с указанием стилей для ID студента
    console.log(`[${new Date().toISOString()}] Формирование заголовков столбцов...`);
    const headers = [
      { 
        header: 'ID студента', 
        key: 'studentId', 
        width: 15,
        style: {
          numFmt: '0', // Формат числа без десятичных знаков
          alignment: { horizontal: 'left' }
        }
      },
      { header: 'Фамилия', key: 'lastName', width: 15 },
      { header: 'Имя', key: 'firstName', width: 15 },
      { header: 'Отчество', key: 'patronymic', width: 15 }
    ];

    // ... остальные заголовки без изменений
    if (statistics.students.some(s => s.averageGrade !== null)) {
      headers.push({ header: 'Средний балл', key: 'averageGrade', width: 12 });
    }

    if (statistics.students.some(s => s.attendancePercentage !== null)) {
      headers.push(
        { header: 'Посещаемость (%)', key: 'attendancePercentage', width: 15 },
        { header: 'Пропущено занятий', key: 'missedLessons', width: 15 }
      );
    }

    if (statistics.students.some(s => s.certificationPercentage !== null)) {
      headers.push({ header: 'Аттестация (%)', key: 'certificationPercentage', width: 15 });
    }

    if (statistics.students.some(s => s.certificationGrade !== null)) {
      headers.push({ header: 'Оценка аттестации', key: 'certificationGrade', width: 15 });
    }

    worksheet.columns = headers;

    // 5. Добавляем данные студентов
    console.log(`[${new Date().toISOString()}] Добавление строк студентов...`);
    statistics.students.forEach((student) => {
      const rowData = {
        studentId: Number(student.studentId), // Явное преобразование в число
        lastName: student.lastName,
        firstName: student.firstName,
        patronymic: student.patronymic
      };

      if (student.averageGrade !== null) {
        rowData.averageGrade = student.averageGrade;
      }

      if (student.attendancePercentage !== null) {
        rowData.attendancePercentage = student.attendancePercentage;
        rowData.missedLessons = student.missedLessons;
      }

      if (student.certificationPercentage !== null) {
        rowData.certificationPercentage = student.certificationPercentage;
      }

      if (student.certificationGrade !== null) {
        rowData.certificationGrade = student.certificationGrade;
      }

      const row = worksheet.addRow(rowData);
      
      // Применяем числовой формат к ячейке с ID студента
      row.getCell('studentId').numFmt = '0'; // Формат числа без десятичных знаков
    });

    // ... остальная часть функции без изменений
    // 6. Добавляем итоговую статистику
    console.log(`[${new Date().toISOString()}] Добавление итоговой статистики группы...`);
    worksheet.addRow([]);

    const summaryRow = worksheet.addRow(['Итого по группе:']);
    summaryRow.font = { bold: true };

    if (statistics.groupAverage !== null) {
      worksheet.addRow(['Средний балл группы:', statistics.groupAverage]);
    }

    if (statistics.groupAttendance !== null) {
      worksheet.addRow(['Посещаемость группы (%):', statistics.groupAttendance]);
      worksheet.addRow(['Среднее пропущенных занятий:', statistics.groupMissedLessons]);
    }

    if (statistics.groupCertificationPercentage !== null) {
      worksheet.addRow(['Аттестация группы (%):', statistics.groupCertificationPercentage]);
    }

    if (statistics.groupCertificationAverage !== null) {
      worksheet.addRow(['Средняя оценка аттестации:', statistics.groupCertificationAverage]);
    }

    // 7. Форматируем заголовки
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 8. Генерируем имя файла
    let fileName = `Статистика_группы_${groupId}`;
    if (semester) fileName += `_семестр_${semester}`;
    if (statementId) fileName += `_ведомость_${statementId}`;
    fileName += '.xlsx';

    console.log(`[${new Date().toISOString()}] Генерация имени файла: ${fileName}`);

    // 9. Отправляем файл
    console.log(`[${new Date().toISOString()}] Отправка Excel-файла клиенту...`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(fileName)}`
    );

    await workbook.xlsx.write(res);
    res.end();

    console.log(`[${new Date().toISOString()}] Файл статистики для группы ${groupId} успешно сформирован и отправлен`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при формировании статистики для группы ${groupId}:`, error);
    res.status(500).json({
      error: "Ошибка сервера",
      details: error.message
    });
  }
};