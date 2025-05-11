// src/models/faculty.js
export default (sequelize, DataTypes) => {
  const Faculty = sequelize.define('Faculty', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Название'
    },
    abbreviation: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'Аббревиатура',
      validate: {
        len: [1, 10] // Ограничение длины от 1 до 10 символов
      }
    },
    deanLogin: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Декан',
      references: {
        model: {
          tableName: 'Пользователи'
        },
        key: 'Логин'
      }
    }
  }, {
    tableName: 'Факультеты',
    timestamps: false
  });

  return Faculty;
};