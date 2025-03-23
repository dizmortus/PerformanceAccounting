// src/models/group.js
export default (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'ID'
    },
    specialtyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'ID Специальности',
      references: {
        model: 'Специальности',
        key: 'ID'
      }
    },
    admissionYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 2000,
        max: new Date().getFullYear()
      },
      field: 'Год поступления'
    },
    educationForm: {
      type: DataTypes.ENUM('дневная', 'заочная', 'дистанционная'),
      allowNull: false,
      field: 'Форма обучения'
    },
    educationLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isIn: [['1', '2']]
      },
      field: 'Ступень обучения'
    }
  }, {
    tableName: 'Группы',
    timestamps: false
  });

  return Group;
};