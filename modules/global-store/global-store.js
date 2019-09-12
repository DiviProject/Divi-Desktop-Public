const store = {};

function set(key, value) {
    store[key] = value;
}   

function get(key) {
    return store[key];
}

exports.set = set;
exports.get = get;