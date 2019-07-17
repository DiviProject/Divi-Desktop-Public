import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable()
export class InvocationService {
    constructor() {
    }

    public run(func: Function, retries: number = 1, timeout: number = 0): Observable<any> {
        return Observable.create(obs => {
            const onSuccess = (result) => {
                obs.next(result);
                obs.complete();
            }

            const onError = (error) => {
                if (retries <= 1) {
                    obs.error(error);
                } else {
                    setTimeout(() => {
                        this.run(func, retries - 1, timeout)
                            .subscribe(r => onSuccess(r), e => obs.error(e));
                    }, timeout);
                }
            }

            const funcResult = func();
           
            if (funcResult instanceof Observable) {
                const observable = funcResult;
                observable.subscribe((result) => onSuccess(result), (error) => onError(error));
            }

            if (funcResult instanceof Promise) {
                const promise = funcResult;
                promise.then((result) => onSuccess(result), (error) => onError(error));
            }
        });
    }

    public timeout(func: Function, delay: number): any {
        return setTimeout(func, delay);
    }

    public delay(delay: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, delay);
        });
    }

    public limited(action: Function, time: number): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(reject, time);
            try {
                const result = await action();
                resolve(result);
            } catch (e) {
                reject(e);
            }

            clearTimeout(timeout);
        });
    }
}