import { mainProgramLoop } from './main';
import { log }  from './common/logger';

try {
	mainProgramLoop()
		.then(() => log('done'))
		.catch((error) => {
			log(error.message);
			log(error.stack);
		})
		.finally(() => {
			log('finally');
		});
} catch (error: any) {
	log(error.message);
	log(error.stack);
}

