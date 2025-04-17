// src/models/statement.js
export default (sequelize, DataTypes) => {
  const Statement = sequelize.define('Statement', {
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
    },
    assessmentType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['зачет', 'экзамен', 'практика', 'курсовой проект', 'дифференцированный зачет']]
      },
      field: 'Тип аттестации'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'Дата'
    },
    list: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'Ведомость'
    }
  }, {
    tableName: 'Ведомости',
    timestamps: false
  });

  return Statement;
};