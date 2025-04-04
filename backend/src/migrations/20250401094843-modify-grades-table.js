// migrations/modify-grades-table.js
'use strict';

export default {
  up: async (queryInterface, Sequelize) => {
    // 1. Создаем временную таблицу
    await queryInterface.createTable('Оценки_temp', {
      ID: Sequelize.BIGINT,
      'ID Ведомости': Sequelize.BIGINT,
      'ID Cтудента': Sequelize.BIGINT,
      Оценка: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    // 2. Копируем данные
    await queryInterface.sequelize.query(`
      INSERT INTO "Оценки_temp" 
      SELECT * FROM "Оценки"
    `);

    // 3. Удаляем оригинальную таблицу
    await queryInterface.dropTable('Оценки');

    // 4. Создаем новую таблицу
    await queryInterface.createTable('Оценки', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      'ID Ведомости': {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'Ведомости',
          key: 'ID'
        }
      },
      'ID Занятия': {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'Занятия',
          key: 'ID'
        }
      },
      'ID Cтудента': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Cтуденты',
          key: 'ID'
        }
      },
      Оценка: {
        type: Sequelize.STRING,
        allowNull: false
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

    // 5. Добавляем проверку для оценки
    await queryInterface.addConstraint('Оценки', {
      fields: ['Оценка'],
      type: 'check',
      where: {
        Оценка: {
          [Sequelize.Op.in]: [
            'зачтено', 'не зачтено', 'не явился', 'не допущен', 
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
          ]
        }
      }
    });

    // 6. Добавляем проверку, что указана либо ведомость, либо занятие
    await queryInterface.addConstraint('Оценки', {
      fields: ['ID Ведомости', 'ID Занятия'],
      type: 'check',
      where: {
        [Sequelize.Op.or]: [
          { 'ID Ведомости': { [Sequelize.Op.not]: null } },
          { 'ID Занятия': { [Sequelize.Op.not]: null } }
        ],
        [Sequelize.Op.not]: {
          'ID Ведомости': { [Sequelize.Op.not]: null },
          'ID Занятия': { [Sequelize.Op.not]: null }
        }
      }
    });

    // 7. Переносим данные
    await queryInterface.sequelize.query(`
      INSERT INTO "Оценки" 
        ("ID", "ID Ведомости", "ID Cтудента", "Оценка", "createdAt", "updatedAt")
      SELECT 
        "ID", "ID Ведомости", "ID Cтудента", "Оценка", "createdAt", "updatedAt"
      FROM "Оценки_temp"
    `);

    // 8. Удаляем временную таблицу
    await queryInterface.dropTable('Оценки_temp');
  },

  down: async (queryInterface, Sequelize) => {
    // Восстановление предыдущей структуры
    await queryInterface.createTable('Оценки_temp', {
      ID: Sequelize.BIGINT,
      'ID Ведомости': Sequelize.BIGINT,
      'ID Занятия': Sequelize.BIGINT,
      'ID Cтудента': Sequelize.BIGINT,
      Оценка: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    // Копируем данные
    await queryInterface.sequelize.query(`
      INSERT INTO "Оценки_temp" 
      SELECT * FROM "Оценки"
      WHERE "ID Ведомости" IS NOT NULL
    `);

    // Удаляем новую таблицу
    await queryInterface.dropTable('Оценки');

    // Восстанавливаем оригинальную таблицу
    await queryInterface.createTable('Оценки', {
      ID: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      'ID Ведомости': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Ведомости',
          key: 'ID'
        }
      },
      'ID Cтудента': {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Cтуденты',
          key: 'ID'
        }
      },
      Оценка: {
        type: Sequelize.STRING,
        allowNull: false
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
      INSERT INTO "Оценки" 
      SELECT "ID", "ID Ведомости", "ID Cтудента", "Оценка", "createdAt", "updatedAt"
      FROM "Оценки_temp"
    `);

    // Удаляем временную таблицу
    await queryInterface.dropTable('Оценки_temp');
  }
};