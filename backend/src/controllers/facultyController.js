import { Faculty, User } from "../models/index.js";

// Получение всех факультетов
export const getAllFaculties = async (req, res) => {
    console.log('Starting getAllFaculties function');
    try {
        console.log('Attempting to fetch all faculties from database');
        // Получаем все факультеты
        const faculties = await Faculty.findAll({
            attributes: ['id', 'name', 'abbreviation'],
            include: [{
                model: User,
                as: 'dean',
                attributes: ['login', 'lastName', 'firstName', 'patronymic'],
                required: false
            }],
            order: [['name', 'ASC']]
        });

        console.log(`Found ${faculties.length} faculties in database`);
        console.log('Faculties data:', JSON.stringify(faculties, null, 2));

        // Получаем факультет текущего пользователя (если есть)
        let currentUserFaculty = null;
        if (req.user?.facultyId) {
            console.log(`Current user has facultyId: ${req.user.facultyId}, fetching details`);
            currentUserFaculty = await Faculty.findByPk(req.user.facultyId, {
                attributes: ['id', 'name', 'abbreviation'],
                include: [{
                    model: User,
                    as: 'dean',
                    attributes: ['login', 'lastName', 'firstName', 'patronymic'],
                    required: false
                }]
            });
            console.log('Current user faculty data:', JSON.stringify(currentUserFaculty, null, 2));
        } else {
            console.log('Current user has no facultyId or user not authenticated');
        }

        // Форматируем ответ
        const response = {
            faculties: faculties.map(faculty => ({
                id: faculty.id,
                name: faculty.name,
                abbreviation: faculty.abbreviation,
                dean: faculty.dean ? {
                    login: faculty.dean.login,
                    fullName: `${faculty.dean.lastName} ${faculty.dean.firstName} ${faculty.dean.patronymic}`.trim()
                } : null,
                isCurrent: faculty.id === req.user?.facultyId
            })),
            currentUserFaculty: currentUserFaculty ? {
                id: currentUserFaculty.id,
                name: currentUserFaculty.name,
                abbreviation: currentUserFaculty.abbreviation,
                dean: currentUserFaculty.dean ? {
                    login: currentUserFaculty.dean.login,
                    fullName: `${currentUserFaculty.dean.lastName} ${currentUserFaculty.dean.firstName} ${currentUserFaculty.dean.patronymic}`.trim()
                } : null
            } : null
        };

        console.log('Prepared response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error("Ошибка при получении списка факультетов:", error);
        res.status(500).json({ 
            error: "Ошибка сервера", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Получение факультета по ID
export const getFacultyById = async (req, res) => {
    console.log('Starting getFacultyById function');
    try {
        const { id } = req.params;
        console.log(`Requested faculty ID: ${id}`);

        if (!id || isNaN(Number(id))) {
            console.error('Invalid faculty ID provided:', id);
            return res.status(400).json({ error: "Некорректный ID факультета" });
        }

        console.log(`Fetching faculty with ID: ${id}`);
        const faculty = await Faculty.findByPk(Number(id), {
            attributes: ['id', 'name', 'abbreviation'],
            include: [{
                model: User,
                as: 'dean',
                attributes: ['login', 'lastName', 'firstName', 'patronymic', 'email'],
                required: false
            }]
        });

        if (!faculty) {
            console.error(`Faculty with ID ${id} not found`);
            return res.status(404).json({ error: "Факультет не найден" });
        }

        console.log('Found faculty:', JSON.stringify(faculty, null, 2));

        // Форматируем ответ
        const response = {
            id: faculty.id,
            name: faculty.name,
            abbreviation: faculty.abbreviation,
            dean: faculty.dean ? {
                login: faculty.dean.login,
                fullName: `${faculty.dean.lastName} ${faculty.dean.firstName} ${faculty.dean.patronymic}`.trim(),
                email: faculty.dean.email
            } : null
        };

        console.log('Prepared response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error("Ошибка при получении данных факультета:", error);
        res.status(500).json({ 
            error: "Ошибка сервера", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};