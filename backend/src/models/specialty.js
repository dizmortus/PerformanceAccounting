// src/models/specialty.js
export default (sequelize, DataTypes) => {
  const Specialty = sequelize.define('Specialty', {
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
      references: {
        model: 'Факультеты',
        key: 'ID'
      },
      allowNull: false,
      field: 'ID Факультета'
    },
    coursesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      field: 'Количество курсов'
    }
  }, {
    tableName: 'Специальности',
    timestamps: false
  });

  return Specialty;
};