const { CommandManager, Command } = require('@jodu555/commandmanager');
const { getSeries, getAuthHelper, toAllSockets } = require('./utils');

const commandManager = CommandManager.getCommandManager();

function registerCommands() {
    commandManager.registerCommand(
        new Command(
            ['reload', 'rl'],
            'reload',
            'Reloads the infos from current out.json file wihout before saving them',
            (command, [...args], scope) => {
                getSeries(true);
                return 'Reloaded the series config successfully';
            }
        )
    );
    commandManager.registerCommand(
        new Command(
            ['authsession', 'as'],
            'authsession [list]',
            'Lists the current authenticated session',
            (command, [...args], scope) => {
                if (args[1] == 'list') {
                    const output = ['Current authsessions:']
                    for (const [token, obj] of getAuthHelper().tokens) {
                        output.push(` - ${token} => ${obj.username}`);
                    }
                    output.push('', '------------------------------------');
                    return output;
                } else {
                    return 'You need to specify an argument!';
                }
            }
        )
    );

    commandManager.registerCommand(
        new Command(
            ['reloadClient', 'rlc'],
            'reloadClient',
            'Reloads the page for all current connected sockets',
            (command, [...args], scope) => {
                toAllSockets(s => { s.emit('reload') }, s => s.auth.type == 'client');
                return '';
            }
        )
    );
}

module.exports = {
    registerCommands
}