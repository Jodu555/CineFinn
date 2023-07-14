import express, { Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseTodoItem } from '../types/database';
import { AuthenticatedRequest } from '../types/session';
const { getAniworldInfos } = require('../sockets/scraper.socket');
const database = Database.getDatabase();

export default async (req: AuthenticatedRequest, res: Response) => {
	const todosDB = await database.get<DatabaseTodoItem>('todos').get();
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
