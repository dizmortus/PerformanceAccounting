// src/models/user.js
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    login: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'Логин'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'Почта',
      validate: {
        isEmail: true,
      }
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'Хеш пароля'
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
      field: 'Отчество'
    },
    role: {
      type: DataTypes.ENUM('Преподаватель', 'Администратор'),
      allowNull: false,
      field: 'Роль',
      defaultValue: 'Преподаватель',
      validate: {
        isIn: [['Преподаватель', 'Администратор']],
      }
    },
    status: {
      type: DataTypes.ENUM('Активный', 'Заблокированный'),
      allowNull: false,
      field: 'Статус',
      defaultValue: 'Активный',
      validate: {
        isIn: [['Активный', 'Заблокированный']],
      }
    },
    facultyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'ID Факультета',
      references: {
        model: {
          tableName: 'Факультеты' // Явное указание имени таблицы
        },
        key: 'ID'
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'Рефреш токен'
    }
  }, {
    tableName: 'Пользователи',
    timestamps: false
  });

  return User;
};