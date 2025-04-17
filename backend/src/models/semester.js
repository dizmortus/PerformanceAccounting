// src/models/semester.js
export default (sequelize, DataTypes) => {
    const Semester = sequelize.define('Semester', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: 'ID'
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
      disciplineId: {
        type: DataTypes.BIGINT,
        references: {
          model: 'Дисциплины',
          key: 'ID'
        },
        allowNull: false,
        field: 'ID Дисциплины'
      },
      semester: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]
        },
        field: 'Семестр'
      },
      hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        field: 'Часы'
      },
      creditUnits: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        field: 'Зачетные единицы'
      }
    }, {
      tableName: 'Семестры',
      timestamps: false
    });
  
    return Semester;
  };