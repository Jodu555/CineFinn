module.exports = () => {

    const { Database } = require('@jodu555/mysqlapi');
    const database = Database.getDatabase();

    database.createTable('jobs', {
        options: {},
        ID: {
            type: 'varchar(64)',
            null: false,
        },
        lastRun: {
            type: 'varchar(64)',
        },
    });
}