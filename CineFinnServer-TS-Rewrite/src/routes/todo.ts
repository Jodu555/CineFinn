import express, { Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseParsedTodoItem, DatabaseTodoItem } from '../types/database';
import { AuthenticatedRequest } from '../types/session';
import { getAniworldInfos, isScraperSocketConnected } from '../sockets/scraper.socket';
const database = Database.getDatabase();

export default async (req: AuthenticatedRequest, res: Response) => {
	const todosDB = await database.get<DatabaseTodoItem>('todos').get();
	const todos: DatabaseParsedTodoItem[] = todosDB.map((t) => JSON.parse(t.content));

	if (isScraperSocketConnected()) {
		for (const todo of todos) {
			if (todo.references.aniworld && !todo.scraped) {
				try {
					todo.scraped = await getAniworldInfos({ url: todo.references.aniworld });
				} catch (error) { }
			}
		}
	}

	res.json(todos.sort((a, b) => a.order - b.order));
};
