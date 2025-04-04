// src/models/lesson.js
export default (sequelize, DataTypes) => {
    const Lesson = sequelize.define('Lesson', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
      },
      statementId: {
        type: DataTypes.BIGINT,
        references: {
          model: 'Ведомости',
          key: 'ID'
        },
        allowNull: false,
        field: 'ID Ведомости'
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'Дата'
      }
    }, {
      tableName: 'Занятия',
      timestamps: false
    });
  
    return Lesson;
  };