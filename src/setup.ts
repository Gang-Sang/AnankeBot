import prompt from 'prompt';
import cryptojs from 'crypto-js';
import config from './appConfig.json'

prompt.start();

prompt.get(['password'], function (err: any, result: any) {
	if (err) { throw 'error' ;}

	console.log('');
	console.log('Command-line input received:');
	console.log('  password: ' + result.password);
	console.log('');

	const ciphertext = cryptojs.AES.encrypt(config.privateKey, result.password).toString();
	console.log('Replace this into the private key field (no spaces) in appConfig.json. Close this window after use:');
	console.log(ciphertext);
});
