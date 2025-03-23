export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    login: {
      type: DataTypes.STRING,
      primaryKey: true,
      field: 'Логин' // Название столбца в базе данных
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'Почта',
      validate: {
        isEmail: true, // Валидация формата email
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
      type: DataTypes.ENUM('Преподаватель', 'Администратор'), // Ограничение значений
      allowNull: false,
      field: 'Роль',
      defaultValue: 'Преподаватель', // Значение по умолчанию
      validate: {
        isIn: [['Преподаватель', 'Администратор']], // Валидация допустимых значений
      }
    },
    status: {
      type: DataTypes.ENUM('Активный', 'Заблокированный'), // Ограничение значений
      allowNull: false,
      field: 'Статус',
      defaultValue: 'Активный', // Значение по умолчанию
      validate: {
        isIn: [['Активный', 'Заблокированный']], // Валидация допустимых значений
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'Рефреш токен'
    }
  }, {
    tableName: 'Пользователи', // Название таблицы в базе данных
    timestamps: false
  });

  return User;
};