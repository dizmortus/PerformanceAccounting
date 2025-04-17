import { Journal, Semester, User } from "../models/index.js";
import { Op } from "sequelize";

export const findOrCreateJournal = async ({ teacherLogin, semesterId }) => {
    console.log(`[findOrCreateJournal] Начало работы. Параметры:`, {
        teacherLogin,
        semesterId
    });

    try {
        // Проверка существования семестра и преподавателя
        console.log(`[findOrCreateJournal] Поиск семестра ${semesterId} и преподавателя ${teacherLogin}...`);
        const [semester, teacher] = await Promise.all([
            Semester.findByPk(semesterId),
            User.findOne({
                where: {
                    Логин: teacherLogin
                }
            })
        ]);

        if (!semester) {
            console.error(`[findOrCreateJournal] Семестр ${semesterId} не найден`);
            throw new Error("Семестр не найден");
        }
        if (!teacher) {
            console.error(`[findOrCreateJournal] Преподаватель ${teacherLogin} не найден`);
            throw new Error("Преподаватель не найден");
        }

        // Пытаемся найти существующий журнал
        console.log(`[findOrCreateJournal] Поиск существующего журнала...`);
        let existingJournal = await Journal.findOne({
            where: {
                teacherLogin,
                semesterId
            }
        });

        if (existingJournal) {
            console.log(`[findOrCreateJournal] Найден существующий журнал:`, existingJournal.toJSON());
            return existingJournal;
        }

        // Если журнал не найден - создаем новый с ID семестра
        console.log(`[findOrCreateJournal] Создание нового журнала с ID=${semesterId}...`);
        try {
            existingJournal = await Journal.create({
                id: semesterId, // Используем ID семестра как ID журнала
                teacherLogin,
                semesterId
            });
            
            console.log(`[findOrCreateJournal] Журнал успешно создан:`, existingJournal.toJSON());
            return existingJournal;
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.warn(`[findOrCreateJournal] Ошибка уникальности ID ${semesterId}, создаем с новым ID`);
                
                // Если не удалось создать с ID семестра, создаем с автоматическим ID
                existingJournal = await Journal.create({
                    teacherLogin,
                    semesterId
                });
                
                console.log(`[findOrCreateJournal] Журнал создан с автоматическим ID:`, existingJournal.toJSON());
                return existingJournal;
            }
            
            console.error(`[findOrCreateJournal] Ошибка при создании журнала:`, error);
            throw new Error(`Ошибка при создании журнала: ${error.message}`);
        }
    } catch (error) {
        console.error(`[findOrCreateJournal] Критическая ошибка:`, error);
        throw error;
    }
};

/**
 * Обновляет данные журнала
 * @param {number} journalId - ID журнала для обновления
 * @param {Object} updateData - Данные для обновления (может содержать teacherLogin)
 * @returns {Promise<Journal>} Обновленный журнал
 */
export const updateJournal = async (journalId, updateData) => {
    console.log(`[updateJournal] Начало работы. ID журнала: ${journalId}, данные:`, updateData);

    try {
        // Проверяем существование журнала
        const journal = await Journal.findByPk(journalId);
        if (!journal) {
            console.error(`[updateJournal] Журнал с ID ${journalId} не найден`);
            throw new Error("Журнал не найден");
        }

        // Проверяем, есть ли что обновлять
        if (!updateData || Object.keys(updateData).length === 0) {
            console.warn(`[updateJournal] Нет данных для обновления`);
            return journal;
        }

        // Если пытаемся обновить teacherLogin
        if (updateData.teacherLogin) {
            console.log(`[updateJournal] Проверка существования преподавателя ${updateData.teacherLogin}...`);
            const teacher = await User.findOne({
                where: {
                    Логин: updateData.teacherLogin
                }
            });

            if (!teacher) {
                console.error(`[updateJournal] Преподаватель ${updateData.teacherLogin} не найден`);
                throw new Error("Преподаватель не найден");
            }
        }

        console.log(`[updateJournal] Обновление журнала ID ${journalId} данными:`, updateData);
        await journal.update(updateData);

        console.log(`[updateJournal] Журнал успешно обновлен`);
        return journal;
    } catch (error) {
        console.error(`[updateJournal] Ошибка при обновлении журнала:`, error);
        throw error;
    }
};