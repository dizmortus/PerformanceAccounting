//backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) return res.status(403).json({ error: 'Нет доступа' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Неверный токен' });

        console.log("✅ Токен расшифрован:", decoded); // 🔹 Проверяем содержимое токена
        req.user = decoded;  
        next();
    });
};
