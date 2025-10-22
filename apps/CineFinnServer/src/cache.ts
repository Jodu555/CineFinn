import { createHash } from 'crypto';

const cacheMap = new Map<string, {
    meta: {
        lastUpdate: number;
        ttl: number;
    };
    data: any;
}
>();
export async function cache<R>(key: string, fn: () => R): Promise<R> {
    const cache = cacheMap.get(key);
    if (cache) {
        if (cache.meta.lastUpdate + cache.meta.ttl > Date.now()) {
            return cache.data;
        }
    }
    const result = await fn();
    cacheMap.set(key, {
        meta: {
            lastUpdate: Date.now(),
            ttl: 60 * 60 * 1000,
        },
        data: result,
    });
    return result;
}

type TypeOfClassMethod<T, M extends keyof T> = T[M] extends Function ? T[M] : never;

type ExtractMethodNames<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never }[keyof T];
type ExtractMethods<T> = Pick<T, ExtractMethodNames<T>>;

type CacheResult<T> = {
    data: T;
    cacheInfo: {
        cacheKey: string;
        wasHit: boolean;
        lastUpdate: number;
        ttl: number;
        expiresAt: number;
    };
};

export async function automatedCache<C, M extends ExtractMethodNames<C>>(
    classInstance: C,
    method: M,
    args: Parameters<C[M] extends (...args: any[]) => any ? C[M] : never>,
    ttl: number = 60 * 60 * 1000
): Promise<CacheResult<C[M] extends (...args: any[]) => infer R ? Awaited<R> : never>> {
    const methodName = String(method);
    const jsonArgs = JSON.stringify(args);
    const key = createHash('md5').update(`${methodName}-${jsonArgs}`).digest('hex');

    const cache = cacheMap.get(key);
    if (cache) {
        if (cache.meta.lastUpdate + ttl > Date.now()) {
            return {
                data: cache.data,
                cacheInfo: {
                    cacheKey: key,
                    wasHit: true,
                    lastUpdate: cache.meta.lastUpdate,
                    ttl: cache.meta.ttl,
                    expiresAt: cache.meta.lastUpdate + cache.meta.ttl,
                },
            };
        }
    }

    // console.log('Cache Miss', key, args, methodName);

    // Call the method with proper 'this' binding
    const result = await (classInstance[method] as Function).call(classInstance, ...args);

    const now = Date.now();
    cacheMap.set(key, {
        meta: {
            lastUpdate: now,
            ttl,
        },
        data: result,
    });

    console.log(cacheMap.size);

    return {
        data: result,
        cacheInfo: {
            cacheKey: key,
            wasHit: false,
            lastUpdate: now,
            ttl,
            expiresAt: now + ttl,
        },
    };
}


export async function invalidateCache(key: string) {
    cacheMap.delete(key);
}