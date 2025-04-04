// migrations/create-educational-process-table.js
'use strict';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Учебный процесс', {
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

    // Добавляем проверку для семестра
    await queryInterface.addConstraint('Учебный процесс', {
      fields: ['Семестр'],
      type: 'check',
      where: {
        Семестр: {
          [Sequelize.Op.between]: [1, 10]
        }
      }
    });

    // Добавляем проверку для часов практики
    await queryInterface.addConstraint('Учебный процесс', {
      fields: ['Часы практики'],
      type: 'check',
      where: {
        'Часы практики': {
          [Sequelize.Op.gte]: 0
        }
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Учебный процесс');
  }
};