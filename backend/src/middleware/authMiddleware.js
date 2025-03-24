// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // Убедитесь в правильности пути

export const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(403).json({ error: 'Требуется авторизация' });
    }

    try {
        // Сначала проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Затем проверяем пользователя в базе (только если нужно проверить статус)
        const user = await User.findOne({ 
            where: { login: decoded.login },
            attributes: ['status'] // Получаем только статус для оптимизации
        });

        if (!user) {
            return res.status(403).json({ error: 'Пользователь не найден' });
        }

        if (user.status === 'Заблокированный') {
            return res.status(403).json({ error: 'Аккаунт заблокирован' });
        }

        // Добавляем декодированные данные в запрос
        req.user = decoded;
        next();
    } catch (err) {
        // Улучшенная обработка ошибок
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Срок действия токена истек' });
        }
        return res.status(401).json({ error: 'Неверный токен' });
    }
};