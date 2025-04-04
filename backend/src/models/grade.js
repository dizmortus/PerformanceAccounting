// src/models/grade.js
export default (sequelize, DataTypes) => {
  const Grade = sequelize.define('Grade', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    statementId: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Ведомости',
        key: 'ID'
      },
      allowNull: true,
      field: 'ID Ведомости'
    },
    lessonId: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Занятия',
        key: 'ID'
      },
      allowNull: true,
      field: 'ID Занятия'
    },
    studentId: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Cтуденты',
        key: 'ID'
      },
      allowNull: false,
      field: 'ID Cтудента'
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['зачтено', 'не зачтено', 'не явился', 'не допущен', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']]
      },
      field: 'Оценка'
    }
  }, {
    tableName: 'Оценки',
    timestamps: false,
    validate: {
      eitherStatementOrLesson() {
        if (!this.statementId && !this.lessonId) {
          throw new Error('Оценка должна быть связана либо с ведомостью, либо с занятием');
        }
        if (this.statementId && this.lessonId) {
          throw new Error('Оценка может быть связана только с ведомостью или только с занятием');
        }
      }
    }
  });

  return Grade;
};