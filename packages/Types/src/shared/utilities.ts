export type ValueOf<T> = T[keyof T];

export interface timestamped {
    created_at: number;
    updated_at: number;
}
