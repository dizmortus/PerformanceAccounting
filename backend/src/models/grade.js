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
      allowNull: false,
      field: 'ID Ведомости'
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
    timestamps: false
  });

  return Grade;
};