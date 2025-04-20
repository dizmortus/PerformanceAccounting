// src/models/discipline.js
export default (sequelize, DataTypes) => {
  const Discipline = sequelize.define('Discipline', {
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
    facultyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'ID Факультета',
      references: {
        model: {
          tableName: 'Факультеты' // Явное указание имени таблицы
        },
        key: 'ID'
      }
    },
    isPractice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'Практика'
    }
  }, {
    tableName: 'Дисциплины',
    timestamps: false
  });



  return Discipline;
};