const request = require('request');

function fetch(coin) {
    let coinId = null;

    if (coin === 'divi') {
        coinId = 3441;
    }

    return new Promise((res, rej) => {
        request.get(`http://142.93.141.60:1397/quote/${coinId}`, (error, response, body) => {
            if (error) {
                return rej(error);
            }
            const json = JSON.parse(body);
            return res({ usd: json.USD.price });
        });
    });
}

exports.fetch = fetch;