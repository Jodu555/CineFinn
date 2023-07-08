declare module '@jodu555/commandmanager' {
	interface IOverCommandManager {
		createCommandManager: (streamIn, streamOut) => CommandManagerImpl;
		getCommandManager: () => CommandManagerImpl;
	}

	class Command {
		ID: number;
		command: string | string[];
		usage: string;
		description: string;
		constructor(command: string | string[], usage: string, description: string, callback: (command: string, args: string[], scope: string) => void);
	}

	class CommandManager {
		refresh: () => void;
		callCommand: (line: string, scope: string) => void;
		getAllCommandsWithoutAliases: () => Command[];
		initializeDefaultCommands: () => void;
		disableDefaultCommands: () => void;
		registerCommand: (command: Command) => void;
		unregisterCommand: (command: string) => void;
		deleteCommand: (ID: number) => void;
	}

	export let CommandManager: IOverCommandManager;

	export { Command };
}
