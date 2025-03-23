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
    deanLastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Фамилия декана'
    },
    deanFirstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Имя декана'
    },
    deanPatronymic: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'Отчество декана'
    }
  }, {
    tableName: 'Факультеты',
    timestamps: false
  });

  return Faculty;
};
