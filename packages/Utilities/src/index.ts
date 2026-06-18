export function debounce(cb: Function, delay = 1000, getKey?: (...args: any[]) => string) {
    let timeout: NodeJS.Timeout;
    let lastKey: string | undefined;
    let lastArgs: any[] | undefined;

    return (...args: any[]) => {
        const currentKey = getKey?.(...args);

        // Key changed → flush immediately with old args, then restart
        if (getKey && currentKey !== lastKey && lastArgs !== undefined) {
            clearTimeout(timeout);
            cb(...lastArgs);
            lastArgs = args;
            lastKey = currentKey;
            timeout = setTimeout(() => {
                cb(...args);
                lastArgs = undefined;
            }, delay);
            return;
        }

        lastKey = currentKey;
        lastArgs = args;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            cb(...args);
            lastArgs = undefined;
        }, delay);
    };
}

export function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let wait = false;
    let trailingCall: (() => void) | null = null;

    const runTrailing = () => {
        if (trailingCall) {
            const call = trailingCall;
            trailingCall = null;
            call();
            wait = true;
            setTimeout(() => {
                wait = false;
                runTrailing();
            }, delay);
        } else {
            wait = false;
        }
    };

    return ((...args: any[]) => {
        if (wait) {
            trailingCall = () => func(...args);
            return;
        }

        func(...args);
        wait = true;
        setTimeout(() => {
            wait = false;
            runTrailing();
        }, delay);
    }) as T;
}