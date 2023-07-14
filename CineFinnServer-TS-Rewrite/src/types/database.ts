export interface DatabaseWatchStringItem {
	account_UUID: string;
	watch_string: string;
}

export interface DatabaseJobItem {
	ID: string;
	lastRun: number;
}

export interface DatabaseNewsItem {
	time: number;
	content: string;
}

export interface DatabaseTodoItem {
	ID: string;
	content: string;
}
