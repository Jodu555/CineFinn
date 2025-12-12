import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    system: {
        PORT: number;
        PUBLIC_API_ENDPOINT: string;
        PUBLIC_API_AUTH_TOKEN: string;
    };
    videoPath: string;
    imagePath: string;
    database: {
        host: string;
        username: string;
        password: string;
        database: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
    scraper: {
        authToken: string;
    };
    subsystem: {
        authToken: string;
    };
    registration: {
        enabled: boolean;
        token: string;
    };
    proxyAPIs: {
        segmentapi: {
            url: string;
        }
        anidbapi: {
            url: string;
        }
    }
}

const defaultConfig: Config = {
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
        }
    }
};

let config: Config;

export function getConfig() {
    if (config == undefined) {
        console.log('setted up config');

        config = setupConfigurationManagment<Config>(defaultConfig, cliOptions);
    }
    return config;
}