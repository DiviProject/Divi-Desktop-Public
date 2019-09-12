import { Injectable } from "@angular/core";
import { RpcService } from "../../core/rpc/rpc.module";
import * as _ from 'lodash';
import { CacheService } from "../cache/cache.service";
import { ExchangeType } from "../models/exchange-type.enum";

const PRICES_CACHE_KEY = 'prices_cache';
const PRICES_CACHE_DURATION = 60;

@Injectable()
export class PriceService {
    private types: ExchangeType[] = [
        ExchangeType.CoinGecko,
        ExchangeType.CoinMarketCap
    ];

    constructor(
        private rpc: RpcService,
        private cacheService: CacheService
        ) {
    }

    public async getPrices(): Promise<any> {
        const cachedPrices = this.cacheService.get(PRICES_CACHE_KEY);
    
        if (!!cachedPrices) {
          return cachedPrices;
        }

        const result = {};

        for (var i = 0; i < this.types.length; i++) {
            try {
                const rate = await this.fetch(`fetch-${this.types[i]}-prices`);
                result[this.types[i]] = rate;
            } catch (e) {
                console.log(e);
            }
        }

        const exchanges = Object.keys(result);
        result[ExchangeType.Average] = {
            usd: exchanges.map(k => result[k].usd).reduce((a, b) => a + b, 0) / exchanges.length
        }

        this.cacheService.set(PRICES_CACHE_KEY, result, PRICES_CACHE_DURATION);

        return result;
    }

    private fetch(command: string): Promise<any> {
        return new Promise((res, rej) => {
            this.rpc.call(command).subscribe(r => res(r), e => rej(e));
        });
    }
}