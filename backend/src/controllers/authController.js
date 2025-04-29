//backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import dotenv from "dotenv";
import nodemailer from 'nodemailer';
dotenv.config();

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;


// 🔹 Логин пользователя
export const login = async (req, res) => {
    const { login, password } = req.body;

    try {
        const user = await User.findOne({ where: { login } });

        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Если пользователь со статусом "Смена пароля", меняем на "Активный"
        if (user.status === 'Смена пароля') {
            await User.update({ status: 'Активный' }, { where: { login } });
            user.status = 'Активный'; // Обновляем статус в текущем объекте пользователя
        }

        // Генерация токенов (добавляем facultyId)
        const accessToken = jwt.sign({ 
            login: user.login, 
            role: user.role,
            status: user.status,
            facultyId: user.facultyId  // <- Добавлено
        }, ACCESS_SECRET, { expiresIn: '15m' });
        
        const refreshToken = jwt.sign({ login: user.login }, REFRESH_SECRET, { expiresIn: '7d' });

        await User.update({ refreshToken }, { where: { login } });
        return res.json({ message: 'Успешный вход', accessToken, refreshToken });
    } catch (error) {
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// 🔹 Обновление access-токена
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ error: "Отсутствует refresh-токен" });

        const user = await User.findOne({ where: { refreshToken } });
        if (!user) return res.status(403).json({ error: "Недействительный refresh-токен" });

        try {
            jwt.verify(refreshToken, REFRESH_SECRET);
        } catch (error) {
            return res.status(403).json({ error: "Refresh-токен истек или недействителен" });
        }

        // Генерируем новый access-токен (добавляем facultyId)
        const newAccessToken = jwt.sign(
            { 
                login: user.login, 
                role: user.role,
                facultyId: user.facultyId  // <- Добавлено
            },
            ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

// 🔹 Регистрация пользователя
export const register = async (req, res) => {
    const { login, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ where: { login } });
        if (existingUser) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Генерация токенов
        const accessToken = jwt.sign({ login, role }, ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ login }, REFRESH_SECRET, { expiresIn: '7d' });

        await User.create({
            login,
            passwordHash: hashedPassword,
            role,
            refreshToken
        });

        return res.status(201).json({ message: 'Регистрация успешна', accessToken, refreshToken });
    } catch (error) {
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};




// 🔹 Выход пользователя
export const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Некорректный заголовок авторизации" });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, ACCESS_SECRET);
        } catch (error) {
            return res.status(403).json({ error: "Неверный или просроченный токен" });
        }

        const user = await User.findOne({ where: { login: decoded.login } });

        if (!user) {
            return res.status(403).json({ error: "Пользователь не найден" });
        }

        // Удаляем refresh-токен из БД
        await User.update({ refreshToken: null }, { where: { login: user.login } });

        res.json({ message: "Выход выполнен успешно" });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
};

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const initiatePasswordReset = async (req, res) => {
    try {
        const { login } = req.body;
        
        // Проверка наличия SMTP данных
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.error('SMTP credentials not configured');
            return res.status(500).json({ 
                error: 'Сервис почты не настроен',
                details: 'Отсутствуют данные SMTP'
            });
        }

        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверка статуса пользователя
        if (user.status === 'Смена пароля') {
            return res.status(200).json({ 
                message: 'Пользователь уже в режиме смены пароля',
                status: 'Смена пароля',
                details: 'Код не отправлен - пользователь уже может сменить пароль'
            });
        }

        if (user.status !== 'Активный') {
            return res.status(403).json({ 
                error: 'Сброс пароля невозможен',
                details: `Статус пользователя: "${user.status}". Только активные пользователи могут сбросить пароль.`
            });
        }

        if (!user.email) {
            return res.status(400).json({ error: 'Для этого аккаунта не указана почта' });
        }

        // Генерация 6-символьного кода (A-Z и 2-9)
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключены похожие символы
        let verificationCode = '';
        for (let i = 0; i < 6; i++) {
            verificationCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const codeExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        await User.update({ 
            emailVerificationCode: verificationCode,
            codeExpiresAt: codeExpires
        }, { where: { login } });

        // Маскировка email
        const [localPart, domain] = user.email.split('@');
        const maskedEmail = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart.slice(-1)}@${domain}`;

        // Настройка письма (русский текст)
        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: user.email,
            subject: 'Код для сброса пароля',
            text: `Ваш код подтверждения: ${verificationCode}\nКод действителен 10 минут.`,
            html: `
                <div>
                    <h2>Сброс пароля</h2>
                    <p>Ваш код подтверждения: <strong>${verificationCode}</strong></p>
                    <p>Код действителен в течение 10 минут.</p>
                    <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
                </div>
            `
        };

        // Проверка подключения SMTP
        try {
            await transporter.verify();
            console.log('SMTP connection verified');
        } catch (error) {
            console.error('SMTP connection error:', error);
            return res.status(500).json({ 
                error: 'Ошибка почтового сервера',
                details: 'Не удалось подключиться к SMTP серверу'
            });
        }

        // Отправка письма
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return res.json({ 
                message: 'Код подтверждения отправлен активному пользователю',
                maskedEmail,
                expiresIn: 10
            });
        } catch (sendError) {
            console.error('Email send error:', sendError);
            return res.status(500).json({ 
                error: 'Не удалось отправить письмо',
                details: process.env.NODE_ENV === 'development' ? sendError.message : undefined
            });
        }

    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
export const verifyResetCode = async (req, res) => {
    try {
        const { login, code } = req.body;
        
        const user = await User.findOne({ 
            where: { login },
            attributes: ['login', 'emailVerificationCode', 'codeExpiresAt', 'status']
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь с таким логином не найден' });
        }

        console.log('Stored code:', user.emailVerificationCode);
        console.log('Input code:', code);

        if (!user.emailVerificationCode) {
            console.error('No verification code found for user:', login);
            return res.status(400).json({ error: 'Код подтверждения не был запрошен или истек' });
        }

        if (new Date() > user.codeExpiresAt) {
            // Удаляем просроченный код
            await User.update({ 
                emailVerificationCode: null,
                codeExpiresAt: null
            }, { where: { login } });
            
            return res.status(400).json({ 
                error: 'Срок действия кода истек. Запросите новый код.' 
            });
        }

        if (user.emailVerificationCode !== code) {
            return res.status(400).json({ error: 'Неверный код подтверждения' });
        }

        // Успешная проверка - удаляем код и устанавливаем статус
        await User.update({ 
            status: 'Смена пароля',
            emailVerificationCode: null,  // Исправлена опечатка (было emailVerificationCode)
            codeExpiresAt: null
        }, { where: { login } });

        return res.json({ 
            message: 'Код подтвержден. Теперь вы можете установить новый пароль',
            status: 'Смена пароля'
        });
    } catch (error) {
        console.error('Ошибка при подтверждении кода:', error);
        return res.status(500).json({ 
            error: 'Ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 🔹 Смена пароля (только для пользователей со статусом "Смена пароля")
export const changePassword = async (req, res) => {
    try {
        const { login, newPassword } = req.body;
        
        const user = await User.findOne({ where: { login } });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь с таким логином не найден' });
        }

        if (user.status !== 'Смена пароля') {
            return res.status(403).json({ 
                error: 'Смена пароля недоступна. Запросите сброс пароля сначала.' 
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.update({ 
            passwordHash: hashedPassword,
            status: 'Активный'
        }, { 
            where: { login } 
        });

        return res.json({ 
            message: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.',
            status: 'Активный'
        });
    } catch (error) {
        console.error('Ошибка при смене пароля:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
};