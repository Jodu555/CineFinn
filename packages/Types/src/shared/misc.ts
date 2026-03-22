export interface searchObject {
    series: string;
    season: number;
    episode: number;
    movie: number;
}

export interface permAcc {
    UUID: string;
    username: string;
    role: number;
}

export type DataType<T> =
    T extends 'VERIFICATION' ? { verificationToken: string; } :
    T extends 'PASSWORD_RESET' ? { forgotPasswordToken: string; } :
    undefined;

export interface AuthedVars {
    Variables: {
        credentials: {
            token: string;
            user: import("../models/user.js").Account;
        };
    };
}

export interface Config {
    version: string;
    generatorName: string;
    redisConnection: {
        host: string;
        port: number;
        password: string;
    };
    concurrentGenerators: number;
    useReadRate: boolean;
    useExperimentalAPIUpload: boolean;
    tempImagePath: string;
    pathRemapper: Record<string, string>;
}
