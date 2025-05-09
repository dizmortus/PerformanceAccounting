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
      allowNull: true,
      unique: true,
      field: 'Почта',
      validate: {
        isEmail: true,
      }
    },
    emailPassword: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'Пароль почты'
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
      type: DataTypes.ENUM('Преподаватель', 'Администратор', 'Гость'),
      allowNull: false,
      field: 'Роль',
      defaultValue: 'Гость',
      validate: {
        isIn: [['Преподаватель', 'Администратор', 'Гость']],
      }
    },
    status: {
      type: DataTypes.ENUM('Активный', 'Заблокированный', 'Смена пароля'),
      allowNull: false,
      field: 'Статус',
      defaultValue: 'Активный',
      validate: {
        isIn: [['Активный', 'Заблокированный', 'Смена пароля']],
      }
    },
    facultyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'ID Факультета',
      references: {
        model: {
          tableName: 'Факультеты'
        },
        key: 'ID'
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'Рефреш токен'
    },
    emailVerificationCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
      field: 'Код подтверждения почты'
    },
    codeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'Срок действия кода'
    }
  }, {
    tableName: 'Пользователи',
    timestamps: false
  });

  return User;
};