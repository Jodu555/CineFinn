const fs = require('fs');
const { CommandManager, Command } = require('@jodu555/commandmanager');
const { sendSiteReload } = require('../sockets/client.socket');
const { getSeries, getAuthHelper, getIO } = require('./utils');

const commandManager = CommandManager.getCommandManager();

function registerCommands() {
	commandManager.registerCommand(
		new Command(['reload', 'rl'], 'reload', 'Reloads the infos from current out.json file wihout before saving them', (command, [...args], scope) => {
			getSeries(true);
			return 'Reloaded the series config successfully';
		})
	);
	commandManager.registerCommand(
		new Command(['authsession', 'as'], 'authsession [list]', 'Lists the current authenticated session', (command, [...args], scope) => {
			if (args[1] == 'list') {
				const output = ['Current authsessions:'];
				for (const [token, obj] of getAuthHelper().tokens) {
					output.push(` - ${token} => ${obj.username}`);
				}
				output.push('', '------------------------------------');
				return output;
			} else {
				return 'You need to specify an argument!';
			}
		})
	);

	commandManager.registerCommand(
		new Command(['socketsessions', 'ss'], 'socketsessions', 'Lists the current active socket sessions', async (command, [...args], scope) => {
			const output = ['Current socket sessions:'];
			const sockets = await getIO().fetchSockets();
			for (const socket of sockets) {
				output.push(` - ${socket.auth.type.toUpperCase()} => ${socket.auth.user.username}`);
			}
			output.push('', '------------------------------------');
			return output;
		})
	);

	commandManager.registerCommand(
		new Command(['reloadClient', 'rlc'], 'reloadClient', 'Reloads the page for all current connected sockets', (command, [...args], scope) => {
			sendSiteReload();
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['save'], 'save', 'Saves the current series data to the file', (command, [...args], scope) => {
			fs.writeFileSync(process.env.LOCAL_DB_FILE, JSON.stringify(getSeries(), null, 3), 'utf8');
			return '';
		})
	);

	commandManager.registerCommand(
		new Command(['fetchInfos', 'fi'], 'fetchInfos [all/seriesID]', 'Fetches the informations for a secified series', (command, [...args], scope) => {
			if (args[1] == 'all') {
				console.log('Started to fetch all Series Informations!');
			} else {
				console.log(`Started to fetch the Informations for ${args[1]}!`);
			}
			return '';
		})
	);
}

module.exports = {
	registerCommands,
};
