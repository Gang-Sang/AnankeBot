import { mainProgramLoop } from './main';
import { log } from './common/logger';
import readline from 'readline';

try {
	if (process.platform === 'win32') {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.on('SIGINT', function () {
			process.emit('SIGINT', 'SIGINT');
		});
	}

	process.on('SIGINT', function () {
		//graceful shutdown
		//TODO leave positions on exit
		log('CTRL-C');
		process.exit();
	});

	mainProgramLoop()
		.then(() => log('done'))
		.catch((error) => {
			log(error.message);
			log(error.stack);
		})
		.finally(() => {
			//TODO leave positions on error
			log('finally');
		});
} catch (error: any) {
	log(error.message);
	log(error.stack);
}


