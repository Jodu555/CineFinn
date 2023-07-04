const { Database } = require('@jodu555/mysqlapi');
const fs = require('fs');
const path = require('path');
const { getAniworldInfos } = require('../sockets/scraper.socket');
const database = Database.getDatabase();

module.exports = async (req, res) => {
	const todosDB = await database.get('todos').get();
	const todos = todosDB.map((t) => JSON.parse(t.content));

	for (const todo of todos) {
		if (todo.references.aniworld && !todo.scraped) {
			try {
				todo.scraped = await getAniworldInfos({ url: todo.references.aniworld });
			} catch (error) {}
		}
	}

	res.json(todos.sort((a, b) => a.order - b.order));
};
