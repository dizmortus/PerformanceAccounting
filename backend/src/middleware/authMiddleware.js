// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // Убедитесь в правильности пути

export const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(403).json({ error: 'Требуется авторизация' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Загружаем пользователя с `status` и `facultyId`
        const user = await User.findOne({ 
            where: { login: decoded.login },
            attributes: ['status', 'facultyId', 'role']  // <- Добавляем facultyId и role
        });

        if (!user) return res.status(403).json({ error: 'Пользователь не найден' });
        if (user.status === 'Заблокированный') return res.status(403).json({ error: 'Аккаунт заблокирован' });

        // Добавляем данные из БД в req.user
        req.user = {
            ...decoded,
            facultyId: user.facultyId,  // Берём из БД, а не из токена
            role: user.role             // Берём из БД, а не из токена
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Срок действия токена истек' });
        return res.status(401).json({ error: 'Неверный токен' });
    }
};