import { Database } from '@jodu555/mysqlapi';
export default () => {
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
			// FK: {
			//     account_UUID: 'accounts/UUID',
			// },
		},
		account_UUID: {
			type: 'varchar(64)',
			null: false,
		},
		watch_string: {
			type: 'LONGTEXT',
		},
	});

	database.createTable('news', {
		options: {},
		time: {
			type: 'varchar(64)',
			null: false,
		},
		content: {
			type: 'TEXT',
		},
	});

	database.createTable('todos', {
		options: {},
		ID: {
			type: 'varchar(64)',
			null: false,
		},
		content: {
			type: 'TEXT',
		},
	});

	database.createTable('sync_rooms', {
		options: {
			timestamps: {
				createdAt: true,
			},
		},
		ID: {
			type: 'varchar(64)',
			null: false,
		},
		seriesID: {
			type: 'varchar(64)',
			null: false,
		},
		members: {
			type: 'TEXT',
		},
	});
};
