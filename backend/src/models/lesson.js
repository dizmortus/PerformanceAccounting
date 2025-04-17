
// src/models/lesson.js
export default (sequelize, DataTypes) => {
  const Lesson = sequelize.define('Lesson', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    journalId: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Журналы',
        key: 'ID'
      },
      allowNull: false,
      field: 'ID Журнала'
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