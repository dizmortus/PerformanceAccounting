// src/models/student.js
export default (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Фамилия'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'Имя'
    },
    patronymic: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'Отчество'
    },
    groupId: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Группы',
        key: 'ID'
      },
      allowNull: false,
      field: 'ID Группы'
    }
  }, {
    tableName: 'Cтуденты',
    timestamps: false
  });

  return Student;
};