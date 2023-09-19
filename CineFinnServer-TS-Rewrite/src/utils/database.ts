import { Database } from '@jodu555/mysqlapi';
export default () => {
	const database = Database.getDatabase();

	database.createTable('jobs', {
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
		time: {
			type: 'varchar(64)',
			null: false,
		},
		content: {
			type: 'TEXT',
		},
	});

	database.createTable('todos', {
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
		entityInfos: {
			type: 'TEXT',
		},
		members: {
			type: 'TEXT',
		},
	});
};
