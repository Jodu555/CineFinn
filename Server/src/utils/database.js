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

    database.createTable('watch_strings', {
        options: {
            PK: 'account_UUID',
            FK: {
                account_UUID: 'accounts/UUID',
            },
        },
        account_UUID: {
            type: 'varchar(64)',
            null: false,
        },
        watch_string: {
            type: 'LONGTEXT',
        },
    });
}