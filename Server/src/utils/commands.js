const { CommandManager, Command } = require('@jodu555/commandmanager');
const { getSeries } = require('./utils');

const commandManager = CommandManager.getCommandManager();

function registerCommands() {
    commandManager.registerCommand(
        new Command(
            'reload',
            'reload',
            'Reloads the infos from current out.json file wihout before saving them',
            (command, [...args], scope) => {
                getSeries(true);
                return 'Reloaded the series config successfully';
            }
        )
    );
}

module.exports = {
    registerCommands
}