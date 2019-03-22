export class FormatHelper {
    public static formatError(error: any): string {
        if (!error) {
            return '';
        }

        if (typeof(error) === 'string') {
            return error;
        }

        if (error instanceof Error) {
            return error.message;
        }

        if (!!error.message && typeof(error.message) === 'string') {
            return error.message;
        }

        return JSON.stringify(error);
    }
}