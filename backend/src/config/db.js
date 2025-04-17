import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем переменные окружения
dotenv.config();

// Получаем путь к текущему файлу
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем JSON-файл
const configPath = join(__dirname, './config.json');
const config = JSON.parse(await readFile(configPath, 'utf-8'));

// Определяем настройки подключения к базе данных
const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

// Создаём подключение к базе данных
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    port: dbConfig.port,
    logging: false, // явное отключение логгирования
    benchmark: false // дополнительное отключение метрик
  }
);

export default sequelize;