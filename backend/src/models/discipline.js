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
    }
  }, {
    tableName: 'Дисциплины',
    timestamps: false
  });

  return Discipline;
};