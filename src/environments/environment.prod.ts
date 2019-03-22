declare const require: any;

export const environment = {
  production: true,
  version: require('../../package.json').version,
  releasesUrl: 'https://github.com/Divicoin/divi-desktop/releases/latest',
  envName: 'prod'
};
