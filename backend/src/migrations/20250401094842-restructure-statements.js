// migrations/restructure-statements.js
'use strict';

export default {
  up: async (queryInterface, Sequelize) => {
    // 1. First check if the table exists
    const tableExists = await queryInterface.showAllTables();
    if (tableExists.includes('Ведомости')) {
      await queryInterface.dropTable('Ведомости', { cascade: true });
    }

    // 1. Create temporary table for storing original data
    await queryInterface.createTable('Ведомости_temp', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      Преподаватель: Sequelize.STRING,
      'ID Дисциплины': Sequelize.BIGINT,
      'ID Группы': Sequelize.BIGINT,
      'Часы практики': Sequelize.INTEGER,
      Семестр: Sequelize.INTEGER,
      'Тип аттестации': Sequelize.STRING,
      Ведомость: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    // If the original table exists, copy data to temp table
    if (tableExists.includes('Ведомости')) {
      await queryInterface.sequelize.query(`
        INSERT INTO "Ведомости_temp" 
        SELECT * FROM "Ведомости"
      `);
      await queryInterface.dropTable('Ведомости');
    }



    // 4. Создаем новую таблицу Ведомости с новой структурой
    await queryInterface.createTable('Ведомости', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      'ID Учебного процесса': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Учебный процесс',
          key: 'ID'
        }
      },
      'Тип аттестации': {
        type: Sequelize.STRING,
        allowNull: false
      },
      Дата: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      Ведомость: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 5. Добавляем проверку для типа аттестации
    await queryInterface.addConstraint('Ведомости', {
      fields: ['Тип аттестации'],
      type: 'check',
      where: {
        'Тип аттестации': {
          [Sequelize.Op.in]: ['зачет', 'экзамен']
        }
      }
    });

    // 6. Создаем таблицу Занятия
    await queryInterface.createTable('Занятия', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      'ID Учебного процесса': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Учебный процесс',
          key: 'ID'
        }
      },
      Дата: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

// 7. Переносим данные из временной таблицы в Учебный процесс
await queryInterface.sequelize.query(`
  INSERT INTO "Учебный процесс" 
    ("Преподаватель", "ID Дисциплины", "ID Группы", "Часы практики", "Семестр", "createdAt", "updatedAt")
  SELECT 
    "Преподаватель", 
    "ID Дисциплины", 
    "ID Группы", 
    "Часы практики", 
    "Семестр", 
    COALESCE("createdAt", CURRENT_TIMESTAMP) as "createdAt",
    COALESCE("updatedAt", CURRENT_TIMESTAMP) as "updatedAt"
  FROM "Ведомости_temp"
  GROUP BY "Преподаватель", "ID Дисциплины", "ID Группы", "Часы практики", "Семестр", "createdAt", "updatedAt"
`);

    // 8. Переносим данные в новую таблицу Ведомости
    await queryInterface.sequelize.query(`
      INSERT INTO "Ведомости" 
        ("ID", "ID Учебного процесса", "Тип аттестации", "Дата", "Ведомость", "createdAt", "updatedAt")
      SELECT 
        t."ID", 
        ep."ID", 
        t."Тип аттестации", 
        COALESCE(t."updatedAt", t."createdAt", CURRENT_TIMESTAMP), 
        t."Ведомость",
        t."createdAt",
        t."updatedAt"
      FROM "Ведомости_temp" t
      JOIN "Учебный процесс" ep ON 
        t."Преподаватель" = ep."Преподаватель" AND
        t."ID Дисциплины" = ep."ID Дисциплины" AND
        t."ID Группы" = ep."ID Группы" AND
        t."Часы практики" = ep."Часы практики" AND
        t."Семестр" = ep."Семестр"
    `);

    // 9. Удаляем временную таблицу
    await queryInterface.dropTable('Ведомости_temp');
  },

  down: async (queryInterface, Sequelize) => {
    // Восстановление предыдущей структуры (упрощенное, может потребоваться доработка)
    await queryInterface.dropTable('Занятия');

    // Создаем временную таблицу для новой структуры
    await queryInterface.createTable('Ведомости_temp', {
      ID: Sequelize.BIGINT,
      'ID Учебного процесса': Sequelize.BIGINT,
      'Тип аттестации': Sequelize.STRING,
      Дата: Sequelize.DATE,
      Ведомость: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    // Копируем данные
    await queryInterface.sequelize.query(`
      INSERT INTO "Ведомости_temp" 
      SELECT * FROM "Ведомости"
    `);

    // Удаляем новую таблицу
    await queryInterface.dropTable('Ведомости');

    // Восстанавливаем оригинальную таблицу
    await queryInterface.createTable('Ведомости', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      Преподаватель: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Пользователи',
          key: 'Логин'
        }
      },
      'ID Дисциплины': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Дисциплины',
          key: 'ID'
        }
      },
      'ID Группы': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Группы',
          key: 'ID'
        }
      },
      'Часы практики': {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      Семестр: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      'Тип аттестации': {
        type: Sequelize.STRING,
        allowNull: false
      },
      Ведомость: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Восстанавливаем данные
    await queryInterface.sequelize.query(`
      INSERT INTO "Ведомости" 
        ("ID", "Преподаватель", "ID Дисциплины", "ID Группы", "Часы практики", "Семестр", 
         "Тип аттестации", "Ведомость", "createdAt", "updatedAt")
      SELECT 
        t."ID", 
        ep."Преподаватель", 
        ep."ID Дисциплины", 
        ep."ID Группы", 
        ep."Часы практики", 
        ep."Семестр",
        t."Тип аттестации", 
        t."Ведомость",
        t."createdAt",
        t."updatedAt"
      FROM "Ведомости_temp" t
      JOIN "Учебный процесс" ep ON t."ID Учебного процесса" = ep."ID"
    `);

    // Удаляем временную таблицу
    await queryInterface.dropTable('Ведомости_temp');
  }
};