import { Command, CommandManager } from "@jodu555/commandmanager";
import { accountsTable, authTokensTable } from "../database.js";
import type { AuthToken } from "@cinefinn/types";
import { getIO, loggerInstances } from "../utils.js";
import { sendSeriesReloadToAll, sendSiteReload, socketStateMap } from "../sockets/client.socket.js";
import { cacheRegistry } from "../routes/admin/cache.js";


export function setupCommandManager() {
    CommandManager.createCommandManager(process.stdin, process.stdout);
    registerCommands();
}

function registerCommands() {
    const commandManager = CommandManager.getCommandManager();

    commandManager.registerCommand(
        new Command(['authsession', 'as'], 'authsession [list/pool]', 'Lists the current authenticated session', async (command, [...args], scope) => {
            const accounts = await accountsTable.get();
            const tokens = await authTokensTable.get();
            if (args[1] == 'list') {
                const output = ['Current authsessions:'];
                for (const token of tokens) {
                    output.push(` - ${token.TOKEN} => ${accounts.find((x) => x.UUID === token.account_UUID)?.username}`);
                }
                output.push('', '------------------------------------');
                return output;
            } else if (args[1] == 'pool') {
                const aggregatedTokensbyUUID = tokens.reduce<Record<string, AuthToken[]>>((acc, cur) => {
                    if (acc[cur.account_UUID]) {
                        acc[cur.account_UUID].push(cur);
                    } else {
                        acc[cur.account_UUID] = [cur];
                    }
                    return acc;
                }, {});

                const output = ['Current Pooled authsessions by UUID:'];
                for (const UUID in aggregatedTokensbyUUID) {
                    output.push(` - ${UUID} => ${accounts.find((x) => x.UUID === UUID)?.username} : ${aggregatedTokensbyUUID[UUID].length}`);
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
            const sockets = (await getIO().fetchSockets());
            sockets.sort((a, b) => {
                const priorities = { client: 0, subsystem: 1, scraper: 2, default: 0 } as any;
                return (priorities[b.data.auth.type as any] || priorities.default) - (priorities[a.data.auth.type] || priorities.default);
            });
            for (const socket of sockets) {
                if (socket.data.auth.type == 'subsystem') {
                    output.push(
                        ` - ${socket.data.auth.type.toUpperCase()} => ${socket.data.auth.id} ${socket.data.auth.endpoint} - ${socket.data.auth.ptoken ? socket.data.auth?.ptoken : ''
                        } BW: ${socket.data.auth.bandwidth} MB/s`
                    );
                }
                if (socket.data.auth.type == 'client') {
                    output.push(
                        ` - ${socket.data.auth.type.toUpperCase()} => ${socket.data.auth.user?.username || ''} - ${socketStateMap.get(socket.id) || '-'} - ${socket.id}`
                    );
                }
                if (socket.data.auth.type == 'scraper') {
                    output.push(` - ${socket.data.auth.type.toUpperCase()} Connected`);
                }
            }
            output.push('', '------------------------------------');
            return output;
        })
    );

    commandManager.registerCommand(
        new Command(
            ['reloadClient', 'rlc'],
            'reloadClient <all/Socket-ID/User-UUID/UserName>',
            'Reloads the page for the specified connected sockets',
            async (command, [...args], scope) => {
                if (args[1] == 'all') {
                    const num = await sendSiteReload();
                    return 'Reloaded ' + num + ' socket(s)';
                } else {
                    const socketIDOrUserUUIDOrUserName = args[1];
                    const sockets = await getIO().fetchSockets();
                    let i = 0;
                    sockets.forEach((x) => {
                        if (x.data.auth.type !== 'client') return;
                        if (x.id == socketIDOrUserUUIDOrUserName || x.data.auth.user?.UUID == socketIDOrUserUUIDOrUserName || x.data.auth.user?.username == socketIDOrUserUUIDOrUserName) {
                            i++;
                            x.emit('reload');
                        }
                    });
                    if (i == 0) {
                        return 'No socket found with Socket-ID or User-UUID:' + socketIDOrUserUUIDOrUserName;
                    } else {
                        return 'Reloaded ' + i + ' socket(s)';
                    }
                }
            }
        )
    );

    commandManager.registerCommand(
        new Command(
            ['cacheclear', 'cac'],
            'cacheclear',
            'Clears All caches that exist',
            async (command, [...args], scope) => {
                for (const cacheKey in cacheRegistry) {
                    const cache = cacheRegistry.get(cacheKey)!;
                    await cache.clear();
                }
                return 'All caches cleared!';
            }
        )
    );

    commandManager.registerCommand(
        new Command(
            ['sendSeriesReload', 'ssr'],
            'sendSeriesReload',
            'Sends a site reload to all connected sockets',
            async (command, [...args], scope) => {
                await sendSeriesReloadToAll();
                return 'Series reload sent to all connected sockets';
            }
        )
    );

    commandManager.registerCommand(
        new Command(
            ['logger', 'l'],
            'logger [instance/list]',
            'Toggles a logger instance or lists all logger instances with their current state',
            async (command, [...args], scope) => {
                if (args[1] == 'list') {
                    const output = ['Logger Instances:'];
                    for (const instance in loggerInstances) {
                        output.push(` - ${instance}: ${loggerInstances[instance] ? 'enabled' : 'disabled'}`);
                    }
                    output.push('');
                    return output;
                } else {
                    const instance = args[1];
                    if (instance in loggerInstances) {
                        loggerInstances[instance] = !loggerInstances[instance];
                        return `Logger instance ${instance} has been toggled to ${loggerInstances[instance] ? 'enabled' : 'disabled'}`;
                    } else {
                        return `Logger instance ${instance} not found`;
                    }
                }
            }
        )
    );
}