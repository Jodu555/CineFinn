const { Database } = require('@jodu555/mysqlapi');
const fs = require('fs');
const path = require('path');
const database = Database.getDatabase();

module.exports = async (req, res) => {
	const todos = await database.get('todos').get();
	res.json(todos.map((t) => JSON.parse(t.content)).sort((a, b) => a.order - b.order));
};
