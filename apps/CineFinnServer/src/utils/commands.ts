import { Command, CommandManager } from "@jodu555/commandmanager";


export function setupCommandManager() {
    CommandManager.createCommandManager(process.stdin, process.stdout);
    registerCommands();
}

function registerCommands() {
    const commandManager = CommandManager.getCommandManager();

    //Add commands here
}