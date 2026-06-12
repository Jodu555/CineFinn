// export function tryCatch<T, E = Error>(fn: () => T) {
//     type Result<TResult, EResult> =
//         | { data: TResult; error: null; }
//         | { data: null; error: EResult; };
//     type ReturnType =
//         T extends Promise<infer P> ? Promise<Result<P, E>> : Result<T, E>;

//     try {
//         const result = fn();
//         if (result instanceof Promise) {
//             return result
//                 .then((data: Promise<unknown>) => ({ data, error: null }))
//                 .catch((e: unknown) => {
//                     return { data: null, error: e as E };
//                 }) as ReturnType;
//         } else {
//             return { data: result, error: null } as ReturnType;
//         }
//     } catch (e: unknown) {
//         return { data: null, error: e as E } as ReturnType;
//     }
// }

type Result<T, E> =
    | { data: T; error: null }
    | { data: null; error: E };

type ReturnType<T, E> =
    T extends Promise<infer P> ? Promise<Result<P, E>> : Result<T, E>;

function tryCatchBase<T, E = Error>(fn: () => T): ReturnType<T, E> {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then((data) => ({ data, error: null }))
                .catch((e: unknown) => ({ data: null, error: e as E })) as ReturnType<T, E>;
        }
        return { data: result, error: null } as ReturnType<T, E>;
    } catch (e: unknown) {
        return { data: null, error: e as E } as ReturnType<T, E>;
    }
}

export const tryCatch = Object.assign(tryCatchBase, {
    withError: <E>() => <T>(fn: () => T) => tryCatchBase<T, E>(fn),
});