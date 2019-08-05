import { Injectable } from '@angular/core';

@Injectable()
export class LocalStorage {
    public get<T>(key: string): T {
        const value = localStorage.getItem(key);

        if (value != null) {
            return JSON.parse(value) as T;
        }

        return null;
    }

    public set<T>(key: string, value: T): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    public remove(key: string): void {
        localStorage.removeItem(key);
    }
}