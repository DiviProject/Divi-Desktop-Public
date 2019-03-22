import { Injectable } from '@angular/core';

class CacheItem {
  constructor(public value, public duration) {
  }
}

@Injectable()
export class CacheService {
  private cache: any[string] = {};
  private interval: any;

  constructor() {
    this.init();
  }

  public init(): void {
    this.interval = setInterval(() => {
      const keys = Object.keys(this.cache);
      keys.forEach(k => {
        const item =  this.cache[k];
        if (item.expiration && item.expiration < new Date().getTime()) {
          this.clear(k);
        } 
      });
    }, 1000);
  }

  public clear(key: string) {
    delete this.cache[key];
  }

  public set(key: string, value: any, duration?: number) {
    const expiration = duration ? new Date().getTime() + duration * 1000 : null;
    this.cache[key] = {
        value: value,
        expiration: expiration
    }    
  }

  public get(key: string) {
    const cacheItem = this.cache[key] as CacheItem;

    if (!cacheItem) {
      return null;
    }

    return cacheItem.value;
  }

  public getOrSet(key: string, value: any): void {
    const cacheItem = this.cache[key] as CacheItem;
    if (cacheItem) {
      return cacheItem.value;
    }
    this.set(key, value);
    return value;
  }
}
