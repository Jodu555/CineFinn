import express, { Response } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { AuthenticatedRequest, Role, User } from '../types/session';
import { isScraperSocketConnected } from '../sockets/scraper.socket';
import { roleAuthorization } from '../utils/roleManager';
import { checkIfTodoNeedsScrape, backgroundScrapeTodo } from '../utils/todo';
import { DatabaseParsedTodoItem, DatabaseTodoItem } from '@Types/database';
const database = Database.getDatabase();

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	const todosDB = await database.get<DatabaseTodoItem>('todos').get();
	const todos: DatabaseParsedTodoItem[] = todosDB.map((t) => JSON.parse(t.content));

	if (isScraperSocketConnected()) {
		for (const todo of todos) {
			if (checkIfTodoNeedsScrape(todo)) {
				backgroundScrapeTodo(todo);
			}
		}
	}

	res.json(todos.sort((a, b) => a.order - b.order));
});

router.get('/permittedAccounts', roleAuthorization(Role.Mod), async (req: AuthenticatedRequest, res: Response) => {
	const accounts = await database.get<User>('accounts').get();

	res.json(
		accounts
			.filter((x) => x.role >= Role.Mod)
			.map((x) => {
				return {
					UUID: x.UUID,
					username: x.username,
					role: x.role,
				};
			})
	);
});

export { router };
