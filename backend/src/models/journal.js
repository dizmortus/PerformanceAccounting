// src/models/journal.js
export default (sequelize, DataTypes) => {
    const Journal = sequelize.define('Journal', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
      },
      teacherLogin: {
        type: DataTypes.STRING,
        references: {
          model: 'Пользователи',
          key: 'Логин'
        },
        allowNull: false,
        field: 'Преподаватель'
      },
      semesterId: {
        type: DataTypes.BIGINT,
        references: {
          model: 'Семестры',
          key: 'ID'
        },
        allowNull: false,
        field: 'ID Семестра'
      }
    }, {
      tableName: 'Журналы',
      timestamps: false
    });
  
    return Journal;
  };