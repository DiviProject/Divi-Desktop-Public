const CoinGecko = require('coingecko-api');

function fetch(coin) {
    const client = new CoinGecko();
    return client.coins.fetch(coin).then(data => {
        const result = {
            usd: data.data.market_data.current_price.usd
        };
        return result;
    });
}

exports.fetch = fetch;