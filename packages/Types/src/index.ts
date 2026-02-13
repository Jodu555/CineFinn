export interface ServerConfig {
    version: string;
    system: {
        PORT: number;
        PUBLIC_API_ENDPOINT: string;
        PUBLIC_API_AUTH_TOKEN: string;
    };
    prometheus: {
        ENABLED: boolean;
        METRICS_PREFIX: string;
        basicAuth: {
            username: string;
            password: string;
        };
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
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
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
        };
        anidbapi: {
            url: string;
        };
        bullboardapi: {
            url: string;
            apiToken: string;
        }
    };
}