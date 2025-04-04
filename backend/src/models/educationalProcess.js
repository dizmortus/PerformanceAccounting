// src/models/educationalProcess.js
export default (sequelize, DataTypes) => {
    const EducationalProcess = sequelize.define('EducationalProcess', {
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
      disciplineId: {
        type: DataTypes.BIGINT,
        references: {
          model: 'Дисциплины',
          key: 'ID'
        },
        allowNull: false,
        field: 'ID Дисциплины'
      },
      groupId: {
        type: DataTypes.BIGINT,
        references: {
          model: 'Группы',
          key: 'ID'
        },
        allowNull: false,
        field: 'ID Группы'
      },
      practiceHours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        field: 'Часы практики'
      },
      semester: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]
        },
        field: 'Семестр'
      }
    }, {
      tableName: 'Учебный процесс',
      timestamps: false
    });
  
    return EducationalProcess;
  };