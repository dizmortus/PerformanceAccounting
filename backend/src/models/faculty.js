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