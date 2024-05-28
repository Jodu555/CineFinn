import { Database } from '@jodu555/mysqlapi';
import { getAniworldInfos, getAnixInfos, getNewZoroInfos } from '../sockets/scraper.socket';
import { DatabaseParsedTodoItem, DatabaseTodoItem } from '../types/database';
import { toAllSockets } from './utils';

const database = Database.getDatabase();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function checkIfTodoNeedsScrape(todo: DatabaseParsedTodoItem) {
	const needsAniworld = !todo.scraped && todo.references.aniworld !== '';
	const needsZoro = !todo.scrapedZoro && !todo.scrapednewZoro && todo.references.zoro !== '';
	const needsAnix = !todo.scrapedAnix && todo.references.anix !== '' && todo.references.anix !== undefined;
	console.log(todo.references.anix, needsAnix);
	const needsSTO = !todo.scraped && todo.references.sto !== '';
	return needsAniworld || needsZoro || needsAnix || needsSTO;
}

export async function backgroundScrapeTodo(todo: DatabaseParsedTodoItem) {
	//Create an Independent Copy of todo

	todo = JSON.parse(JSON.stringify(todo)) as DatabaseParsedTodoItem;
	new Promise<void>(async (resolve, reject) => {
		try {
			if (todo.scrapingError != undefined && todo.scrapingError?.trim() != '') {
				throw new Error('Got Scraping error and waiting for user to intervene and retry');
			}
			const time = Date.now();
			console.log('Kicked off scraper', todo.references);

			const [aniInfos, zoroInfos, stoInfos, anixInfos] = await Promise.all([
				todo.references.aniworld ? getAniworldInfos({ url: todo.references.aniworld }) : null,
				todo.references.zoro ? getNewZoroInfos({ ID: todo.references.zoro }) : null,
				todo.references.sto ? getAniworldInfos({ url: todo.references.sto }) : null,
				todo.references.anix ? getAnixInfos({ slug: todo.references.anix }) : null,
				// todo.references.zoro ? getZoroInfos({ ID: todo.references.zoro }) : null,
			]);

			if (
				(todo.references.aniworld && !aniInfos) ||
				(todo.references.zoro && !zoroInfos) ||
				(todo.references.anix && !anixInfos) ||
				(todo.references.sto && !stoInfos)
			) {
				console.log('Got Bad Infos', aniInfos, 'for url', todo.references.aniworld);
				console.log('Got Bad Infos', zoroInfos, 'for url', todo.references.zoro);
				console.log('Got Bad Infos', stoInfos, 'for url', todo.references.sto);
				console.log('Got Bad Infos', anixInfos, 'for url', todo.references.anix);
				throw new Error('No Aniworld, Zoro, Anix or STO infos found');
			}

			if (todo.scrapingError) delete todo.scrapingError;

			if (aniInfos) todo.scraped = aniInfos;
			if (zoroInfos) todo.scrapednewZoro = zoroInfos;
			if (anixInfos) todo.scrapedAnix = anixInfos;
			if (stoInfos) todo.scraped = stoInfos;

			if (!aniInfos && !stoInfos) todo.scraped = undefined;

			//Updating db todo
			await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });

			let run = true;
			let exitCon = 0;
			let list: DatabaseParsedTodoItem[] = [];
			while (run) {
				exitCon++;
				const todosDBList = await database.get<DatabaseTodoItem>('todos').get();
				list = todosDBList.map((t) => JSON.parse(t.content));

				if (exitCon > 50) {
					run = false;
					console.log('Met Exit condition');
				}

				if (list.find((x) => x.ID == todo.ID).scraped == true) {
					console.log('Impossible....');
					await wait(42);
				} else {
					run = false;
				}
			}

			console.log('Scrape and update for', todo.references, 'took', Date.now() - time, 'ms');

			//sending out full todo list as update
			await toAllSockets(
				(s) => {
					s.emit('todoListUpdate', list);
				},
				(s) => s.auth.type == 'client'
			);
			resolve();
		} catch (error) {
			console.log('Error while backgroundScrapeTodo:', error);
			todo.scraped = undefined;
			delete todo.scraped;
			todo.scrapingError = 'Error while issuing Scraper';
			await database.get('todos').update({ ID: todo.ID }, { content: JSON.stringify(todo) });
			// reject(error);
			const todosDBList = await database.get<DatabaseTodoItem>('todos').get();
			const list: DatabaseParsedTodoItem[] = todosDBList.map((t) => JSON.parse(t.content));

			//sending out full todo list as update
			await toAllSockets(
				(s) => {
					s.emit('todoListUpdate', list);
				},
				(s) => s.auth.type == 'client'
			);
			resolve();
		}
	});
}
