import { Command, CommandManager } from "@jodu555/commandmanager";
import { accountsTable, authTokensTable, episodesTable, moviesTable, seasonsTable, seriesTable, watchableEntitysTable, watchHistoryTable } from "../database.js";
import type { AuthToken, WatchableEntity } from "@cinefinn/types";
import { featureFlags, getIO, loggerInstances } from "../utils.js";
import { sendSeriesReloadToAll, sendSiteReload, socketStateMap } from "../sockets/client.socket.js";
import { cacheRegistry } from "../routes/admin/cache.js";
import { indexStorage } from "../routes/index.js";
import { recommendationStorage } from "../routes/recommendations/recommendations.js";
import { wait } from "@cinefinn/utilities/time";
import path from 'path';
import fs from 'fs';
import { getConfig } from "../config.js";
import { fixSeasons, insertMissingWatchableEntityRuntimes } from "../job/crawler.js";
import { Job } from "../job/Job.js";

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

    //Command: socketsessions
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

    //Command: reloadClient
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

    //Command: cacheclear
    commandManager.registerCommand(
        new Command(
            ['cacheclear', 'cac'],
            'cacheclear',
            'Clears All caches that exist',
            async (command, [...args], scope) => {
                for (const cacheKey of cacheRegistry.keys()) {
                    const cache = cacheRegistry.get(cacheKey)!;
                    const keys = await cache.keys();
                    console.log(`Clearing ${cacheKey} with ${keys.length} keys`);
                    await cache.clear();
                }
                return 'All caches cleared!';
            }
        )
    );

    //Command: sendSeriesReload
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

    //Command: logger
    commandManager.registerCommand(
        new Command(
            ['logger', 'l'],
            'logger [instance/list]',
            'Toggles a logger instance or lists all logger instances with their current state',
            async (command, [...args], scope) => {
                if (args[1] == undefined || args[1] == 'list') {
                    const output = ['Logger Instances:'];
                    for (const _instance in loggerInstances) {
                        const instance = _instance as keyof typeof loggerInstances;
                        output.push(` - ${instance}: ${loggerInstances[instance] ? 'enabled' : 'disabled'}`);
                    }
                    output.push('');
                    return output;
                } else {
                    const _instance = args[1];
                    if (_instance in loggerInstances) {
                        const instance = _instance as keyof typeof loggerInstances;
                        loggerInstances[instance] = !loggerInstances[instance];
                        return `Logger instance ${instance} has been toggled to ${loggerInstances[instance] ? 'enabled' : 'disabled'}`;
                    } else {
                        return `Logger instance ${_instance} not found`;
                    }
                }
            }
        )
    );

    //Command: featureflags
    commandManager.registerCommand(new Command(['featureflags', 'ff'], 'featureflags [list/set]', 'Lists or sets feature flags', async (command, [...args], scope) => {
        if (args[1] == undefined || args[1] == 'list') {
            const output = ['Feature Flags:'];
            for (const _flag in featureFlags) {
                const flag = _flag as keyof typeof featureFlags;
                output.push(` - ${flag}: ${featureFlags[flag] ? 'enabled' : 'disabled'}`);
            }
            output.push('');
            return output;
        } else {
            const _flag = args[1];
            if (_flag in featureFlags) {
                const flag = _flag as keyof typeof featureFlags;
                featureFlags[flag] = !featureFlags[flag];
                return `Feature flag ${flag} has been toggled to ${featureFlags[flag] ? 'enabled' : 'disabled'}`;
            } else {
                return `Feature flag ${_flag} not found`;
            }
        }
    }));

    //Command: delete
    commandManager.registerCommand(
        new Command(
            ['delete', 'del'],
            'delete <Serie-UUID>',
            'Deletes a series and clears its cache',
            async (command, [...args], scope) => {
                const serieUUID = args[1];
                if (!serieUUID) {
                    return 'Please provide a Series UUID to delete';
                }

                console.log(`Are you sure you want to COMPLETELY DELETE ${serieUUID} from the DB`);
                console.log('By Default this command wait\'s 10 seconds before Actually deleting the series');

                await wait(1000 * 10)

                console.log('Starting Deletion');

                console.time('Deletion took')


                await seriesTable.delete({ UUID: serieUUID });
                await moviesTable.delete({ serie_UUID: serieUUID });
                await episodesTable.delete({ serie_UUID: serieUUID });
                await watchableEntitysTable.delete({ serie_UUID: serieUUID });
                await watchHistoryTable.delete({ series_UUID: serieUUID });

                try { await indexStorage.clear(); } catch (e) { }
                try { await recommendationStorage.clear(); } catch (e) { }

                await sendSeriesReloadToAll();

                console.timeEnd('Deletion took')

                return 'Series deleted and cache cleared!';
            }
        )
    );

    //Command: inspect
    commandManager.registerCommand(
        new Command(
            ['inspect', 'is'],
            'inspect <Series/Season/Episode/Movie/WE/WH-UUID>',
            'Inspects a series and prints out all its data',
            async (command, [...args], scope) => {
                const uuid = args[1];
                if (!uuid) {
                    return 'Please provide a UUID to inspect.';
                }

                const serie = await seriesTable.getOne({ UUID: uuid });
                if (serie != null) {
                    console.log(serie);
                }

                const season = await seasonsTable.getOne({ UUID: uuid });
                if (season != null) {
                    console.log(season);
                }

                const episode = await episodesTable.getOne({ UUID: uuid });
                if (episode != null) {
                    console.log(episode);
                }

                const movie = await moviesTable.getOne({ UUID: uuid });
                if (movie != null) {
                    console.log(movie);
                }

                const watchableEntity = await watchableEntitysTable.getOne({ UUID: uuid });
                if (watchableEntity != null) {
                    console.log(watchableEntity);
                }

                const watchHistory = await watchHistoryTable.getOne({ UUID: uuid });
                if (watchHistory != null) {
                    console.log(watchHistory);
                }

                return 'Series inspected!';
            }
        )
    );

    //Command: update
    commandManager.registerCommand(
        new Command(
            ['update', 'upd'],
            'update <Series/Season/Episode/Movie/WE>-UUID',
            'Updates a series and clears its cache NULLS runtime and removes generated previewImages',
            async (command, [...args], scope) => {

                const nullWatchableEntity = async (watchableEntity: WatchableEntity) => {
                    //TODO: If we ever use a hash and phashes we clear them here 
                    await watchableEntitysTable.update({ UUID: watchableEntity.UUID }, {
                        runtime: -1,
                        // IV: null,
                        // hash: null,
                    });
                    const imagePath = path.join(getConfig().imagePath, watchableEntity.serie_UUID, 'previewImages', watchableEntity.watchable_UUID, watchableEntity.UUID);
                    await fs.promises.rmdir(imagePath, { recursive: true });
                    console.log(`Nulled WE(${watchableEntity.UUID}) and deleted Path: ${imagePath}`);
                }

                const uuid = args[1];
                if (!uuid) {
                    return 'Please provide a UUID to update.';
                }

                if (args.length > 1) {
                    return 'Wrong Usage.';
                }

                const serie = await seriesTable.getOne({ UUID: uuid });
                if (serie != null) {
                    const entitys = await watchableEntitysTable.get({ serie_UUID: serie.UUID });
                    for (const entity of entitys) {
                        await nullWatchableEntity(entity);
                    }
                    console.log('Nulled ' + entitys.length + ' WE\'s');
                }

                const season = await seasonsTable.getOne({ UUID: uuid });
                if (season != null) {
                    const episodes = await episodesTable.get({ season_UUID: season.UUID });
                    for (const episode of episodes) {
                        const entitys = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
                        for (const entity of entitys) {
                            await nullWatchableEntity(entity);
                        }
                        console.log('Nulled ' + entitys.length + ' WE\'s');
                    }

                }

                const episode = await episodesTable.getOne({ UUID: uuid });
                if (episode != null) {
                    const entitys = await watchableEntitysTable.get({ watchable_UUID: episode.UUID });
                    for (const entity of entitys) {
                        await nullWatchableEntity(entity);
                    }
                    console.log('Nulled ' + entitys.length + ' WE\'s');
                }

                const movie = await moviesTable.getOne({ UUID: uuid });
                if (movie != null) {
                    const entitys = await watchableEntitysTable.get({ watchable_UUID: movie.UUID });
                    for (const entity of entitys) {
                        await nullWatchableEntity(entity);
                    }
                    console.log('Nulled ' + entitys.length + ' WE\'s');
                }

                const watchableEntity = await watchableEntitysTable.getOne({ UUID: uuid });
                if (watchableEntity != null) {
                    await nullWatchableEntity(watchableEntity);
                    console.log('Nulled WE');
                }

                return 'Series updated!';
            }
        )
    );

    //Command: triggerTest
    commandManager.registerCommand(new Command('triggerTest', 'triggerTest', 'Triggers a test command', async (command, [...args], scope) => {
        return 'Test command triggered/issued!';
    }));

    //Command: insertMissingWatchableEntityRuntimes
    commandManager.registerCommand(
        new Command(
            ['insertMissingWatchableEntityRuntimes', 'imwer'],
            'insertMissingWatchableEntityRuntimes',
            'Inserts missing watchable entity runtimes',
            async (command, [...args], scope) => {
                console.time('insertMissingWatchableEntityRuntimes');
                await insertMissingWatchableEntityRuntimes(Job.fromDummy('crawl'));
                console.timeEnd('insertMissingWatchableEntityRuntimes');
                return 'Missing watchable entity runtimes inserted!';
            }
        )
    );

    //Command: fixSeasons
    commandManager.registerCommand(
        new Command(
            ['fixSeasons', 'fixSe'],
            'fixSeasons',
            'Fixes seasons',
            async (command, [...args], scope) => {
                console.time('fixSeasons');
                await fixSeasons(Job.fromDummy('crawl'));
                console.timeEnd('fixSeasons');
                return 'Seasons fixed!';
            }
        )
    );
}