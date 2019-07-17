import { AuthScopes } from "./auth-scopes.enum";

export class Scope {
    public name: string;
    public value: string;
    public group: string;
}

export class TfaScopesHelper {
    public static getList(): Scope[] {
        return [{
            name: 'Send',
            value: AuthScopes.SEND,
            group: 'general'
        },
        {
            name: 'Backup',
            value: AuthScopes.BACKUP,
            group: 'general'
        },
        {
            name: 'Unlock Wallet',
            value: AuthScopes.UNLOCK_WALLET,
            group: 'general'
        },
        {
            name: 'Console Access',
            value: AuthScopes.CONSOLE_ACCESS,
            group: 'general'
        }];
    }

    public static isValid(value: string): boolean {
        const list = TfaScopesHelper.getList();
        return !!list.filter(i => i.value === value).length;
    }
}

export class TfaScopesModel {
    private scopes: string[] = [];

    constructor(scopes: string | {
        [key: string]: boolean
    }) {
        if (!scopes) {
            return;
        }

        if (typeof scopes === 'string') {
            this.scopes = scopes.split(',').map(s => s.trim()).filter(s => !!s);
        } else {
            const keys = Object.keys(scopes);
            this.scopes = keys.filter(k => scopes[k] === true);
        }
    }

    public add(scope: string): void {
        if (!TfaScopesHelper.isValid(scope)) {
            return;
        }
        this.scopes.push(scope);
    }

    public exists(scope: string): boolean {
        return this.scopes.indexOf(scope) >= 0;
    }

    public remove(scope: string): void {
        this.scopes = this.scopes.filter(s => s !== scope);
    }

    public toString(): string {
        return this.scopes.join(',');
    }

    public toDictionary(): {
        [key: string]: boolean
    } {
        const dict = {};
        this.scopes.forEach(s => dict[s] = true);
        return dict;
    }
}