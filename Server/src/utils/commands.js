const { CommandManager, Command } = require('@jodu555/commandmanager');
const { getSeries, getAuthHelper } = require('./utils');

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
    commandManager.registerCommand(
        new Command(
            'authsession',
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
                }
                return '';
            }
        )
    );
}

module.exports = {
    registerCommands
}