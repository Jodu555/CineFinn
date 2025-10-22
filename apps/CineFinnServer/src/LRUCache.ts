import { createHash } from 'node:crypto';


type ExtractMethodNames<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never }[keyof T];

type CacheResult<T> = {
    data: T;
    cacheInfo: {
        cacheKey: string;
        wasHit: boolean;
        lastUpdate: number;
        lastAccess: number;
        ttl: number;
        expiresAt: number;
        methodName: string;
    };
};

type CacheEntry<T> = {
    meta: {
        lastUpdate: number;
        lastAccess: number;
        ttl: number;
        methodName: string;
        args: any[];
    };
    data: T;
};

// LRU Cache implementation
class LRUCache<T> {
    private cache: Map<string, CacheEntry<T>>;
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key: string): CacheEntry<T> | undefined {
        const entry = this.cache.get(key);
        if (entry) {
            // Update last access time and move to end (most recently used)
            entry.meta.lastAccess = Date.now();
            this.cache.delete(key);
            this.cache.set(key, entry);
        }
        return entry;
    }

    set(key: string, value: CacheEntry<T>): void {
        // If key exists, delete it first to reinsert at end
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // If cache is at max size, remove least recently used (first item)
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey!);
            // console.log(`[cache] Cache size exceeded, removing key: ${firstKey}`);
        }

        this.cache.set(key, value);
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    keys(): IterableIterator<string> {
        return this.cache.keys();
    }

    entries(): IterableIterator<[string, CacheEntry<T>]> {
        return this.cache.entries();
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }
}

// Cache Context class
export class CacheContext {
    private lruCache: LRUCache<any>;
    private name: string;

    constructor(name: string = 'default', maxSize: number = 100) {
        this.name = name;
        this.lruCache = new LRUCache(maxSize);
    }

    async execute<C, M extends ExtractMethodNames<C>>(
        classInstance: C,
        method: M,
        args: Parameters<C[M] extends (...args: any[]) => any ? C[M] : never>,
        ttl: number = 60 * 60 * 1000
    ): Promise<CacheResult<C[M] extends (...args: any[]) => infer R ? Awaited<R> : never>> {
        const methodName = String(method);
        const jsonArgs = JSON.stringify(args);
        const key = createHash('md5').update(`${methodName}-${jsonArgs}`).digest('hex');

        const cache = this.lruCache.get(key);
        if (cache) {
            if (cache.meta.lastUpdate + ttl > Date.now()) {
                return {
                    data: cache.data,
                    cacheInfo: {
                        cacheKey: key,
                        wasHit: true,
                        lastUpdate: cache.meta.lastUpdate,
                        lastAccess: cache.meta.lastAccess,
                        ttl: cache.meta.ttl,
                        expiresAt: cache.meta.lastUpdate + cache.meta.ttl,
                        methodName: cache.meta.methodName,
                    },
                };
            } else {
                console.log(`[${this.name}] Cache Expired`, key, args, methodName);
            }
        }

        // console.log(`[${this.name}] Cache Miss`, key, args, methodName);

        // Call the method with proper 'this' binding
        const result = await (classInstance[method] as Function).call(classInstance, ...args);

        const now = Date.now();
        this.lruCache.set(key, {
            meta: {
                lastUpdate: now,
                lastAccess: now,
                ttl,
                methodName,
                args,
            },
            data: result,
        });

        return {
            data: result,
            cacheInfo: {
                cacheKey: key,
                wasHit: false,
                lastUpdate: now,
                lastAccess: now,
                ttl,
                expiresAt: now + ttl,
                methodName,
            },
        };
    }

    invalidate(key: string): boolean {
        const result = this.lruCache.delete(key);
        if (result) {
            // console.log(`[${this.name}] Cache invalidated for key:`, key);
        } else {
            // console.log(`[${this.name}] Key not found for invalidation:`, key);
        }
        return result;
    }

    invalidateByMethod(methodName: string): number {
        let count = 0;
        for (const [key, entry] of this.lruCache.entries()) {
            if (entry.meta.methodName === methodName) {
                this.lruCache.delete(key);
                count++;
            }
        }
        console.log(`[${this.name}] Invalidated ${count} cache entries for method: ${methodName}`);
        return count;
    }

    invalidateByMethodPattern(pattern: RegExp): number {
        let count = 0;
        for (const [key, entry] of this.lruCache.entries()) {
            if (pattern.test(entry.meta.methodName)) {
                this.lruCache.delete(key);
                count++;
            }
        }
        console.log(`[${this.name}] Invalidated ${count} cache entries matching pattern: ${pattern}`);
        return count;
    }

    invalidateByFilter(filterFn: (methodName: string, args: any[]) => boolean): number {
        let count = 0;
        for (const [key, entry] of this.lruCache.entries()) {
            if (filterFn(entry.meta.methodName, entry.meta.args)) {
                this.lruCache.delete(key);
                count++;
            }
        }
        console.log(`[${this.name}] Invalidated ${count} cache entries by custom filter`);
        return count;
    }

    clear(): void {
        this.lruCache.clear();
        console.log(`[${this.name}] Cache cleared`);
    }

    getStats() {
        const entries: Array<{
            key: string;
            methodName: string;
            args: any[];
            lastUpdate: number;
            lastAccess: number;
        }> = [];

        for (const [key, entry] of this.lruCache.entries()) {
            entries.push({
                key,
                methodName: entry.meta.methodName,
                args: entry.meta.args,
                lastUpdate: entry.meta.lastUpdate,
                lastAccess: entry.meta.lastAccess,
            });
        }

        return {
            name: this.name,
            size: this.lruCache.size(),
            entries,
        };
    }

    has(key: string): boolean {
        return this.lruCache.has(key);
    }

    generateKey(methodName: string, args: any[]): string {
        const jsonArgs = JSON.stringify(args);
        return createHash('md5').update(`${methodName}-${jsonArgs}`).digest('hex');
    }
}

// Default cache context for backward compatibility
const defaultCache = new CacheContext('default', 100);

// Backward compatible function using default cache
export async function automatedCache<C, M extends ExtractMethodNames<C>>(
    classInstance: C,
    method: M,
    args: Parameters<C[M] extends (...args: any[]) => any ? C[M] : never>,
    ttl: number = 60 * 60 * 1000
): Promise<CacheResult<C[M] extends (...args: any[]) => infer R ? Awaited<R> : never>> {
    return defaultCache.execute(classInstance, method, args, ttl);
}

// Helper functions for default cache
export function clearCache(): void {
    defaultCache.clear();
}

export function getCacheStats() {
    return defaultCache.getStats();
}

export function invalidateCache(key: string): boolean {
    return defaultCache.invalidate(key);
}

export function invalidateCacheByMethod(methodName: string): number {
    return defaultCache.invalidateByMethod(methodName);
}

// Usage examples:
/*
// Create different cache contexts
const userCache = new CacheContext('users', 50);

// Use cache
const { data, cacheInfo } = await userCache.execute(seriesTable, 'getOne', [userId]);

// Invalidate by exact key (from cacheInfo)
userCache.invalidate(cacheInfo.cacheKey);

// Invalidate all entries for a specific method
userCache.invalidateByMethod('getOne');

// Invalidate by method name pattern
userCache.invalidateByMethodPattern(/^get/); // All methods starting with 'get'

// Invalidate by custom filter - e.g., all getOne calls with specific userId
userCache.invalidateByFilter((methodName, args) => {
    return methodName === 'getOne' && args[0] === userId;
});

// Invalidate by custom filter - e.g., all calls with args matching a condition
userCache.invalidateByFilter((methodName, args) => {
    return args.some(arg => arg?.status === 'deleted');
});

// Get detailed stats including method names and args
const stats = userCache.getStats();
console.log(stats);
// {
//   name: 'users',
//   size: 5,
//   entries: [
//     { key: 'abc123...', methodName: 'getOne', args: [42], lastUpdate: ..., lastAccess: ... },
//     ...
//   ]
// }
*/