# Divi Desktop Public Repository

> *"Divi is an open source project that aims to ease of use to cryptocurrency."*


This repository is the user interface that works in combination with our [`divi-core`](https://github.com/Divicoin/Divi).

## Development

### Boostrapping for development:

* Download + Install [Node.js®](https://nodejs.org/) 6.4—7.10
* Download + Install [git](https://git-scm.com/)

### Development with Electron

1. Run `ng serve` to start the dev server.
2. Run `yarn run start:electron:dev -testnet -opendevtools` to start the electron application. Daemon will be updated and launched automatically.
   * Note: this command will auto-refresh the client on each saved change
   * `-testnet` – for running on testnet (omit for running the client on mainnet)
   * `-opendevtools` – automatically opens Developer Tools on client launch

#### Interact with divi-core daemon

You can directly interact with the daemon ran by the Electron version.

```
./divi-cli help
```

## Running

### Start Electron

* `yarn run start:electron:fast` – disables debug messages for faster startup (keep in mind using `:fast` disables auto-reload of app on code change)

### Package Electron

* `yarn run package:win` – Windows
* `yarn run package:mac` – OSX
* `yarn run package:linux` – Linux


