export async function up(queryInterface, Sequelize) {
  // Удаляем существующее ограничение
  await queryInterface.removeConstraint('Ведомости', 'Ведомости_Преподаватель заняти_fkey').catch(() => {});

  // Добавляем новое с нужными действиями
  await queryInterface.addConstraint('Ведомости', {
    fields: ['Преподаватель занятий'],
    type: 'foreign key',
    name: 'Ведомости_Преподаватель заняти_fkey',
    references: {
      table: 'Пользователи',
      field: 'Логин',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeConstraint('Ведомости', 'Ведомости_Преподаватель заняти_fkey');
}
