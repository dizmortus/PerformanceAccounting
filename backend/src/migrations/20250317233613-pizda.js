'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
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
      'Оценка': {
        type: Sequelize.STRING,
        allowNull: false
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Оценки');
  }
};
};
