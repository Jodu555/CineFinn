import { setupConfigurationManagment, updateConfigurationManagment } from "@cinefinn/configuration-manager";
import type { ServerConfig } from "@cinefinn/types";

const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

const defaultConfig: ServerConfig = {
    version: '1.0.0',
    system: {
        PORT: 3000,
        PUBLIC_API_ENDPOINT: 'http://localhost:3000',
        PUBLIC_API_AUTH_TOKEN: 'SECR-DEV',
    },
    videoPath: '/tmp/videos',
    imagePath: '/tmp/images',
    database: {
        host: 'localhost',
        username: 'root',
        password: 'root',
        database: 'cinefinn',
    },
    redis: {
        host: 'localhost',
        port: 6379,
        password: 'root',
    },
    smtp: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'yourEmail',
            pass: 'yourAppPassword',
        },
    },
    scraper: {
        authToken: 'SUPER-SECURE-SCRAPER-TOKEN',
    },
    subsystem: {
        authToken: 'SUPER-SECURE-SUBSYSTEM-TOKEN',
    },
    registration: {
        enabled: true,
        token: 'Registration-TOKEN'
    },
    proxyAPIs: {
        segmentapi: {
            url: 'https://segment.io/v1/track',
        },
        anidbapi: {
            url: 'https://api.anidb.net/api',
        },
        bullboardapi: {
            url: 'http://localhost:3001',
            apiToken: 'BULLBOARD-API-TOKEN',
        }
    }
};

let config: ServerConfig;

export function getConfig() {
    if (config == undefined) {
        config = setupConfigurationManagment<ServerConfig>(defaultConfig, cliOptions);
    }
    return config;
}

export function updateConfig(updated: Partial<ServerConfig>) {
    return updateConfigurationManagment<ServerConfig>(updated);
}