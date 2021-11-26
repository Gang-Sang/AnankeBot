import * as fs from 'fs';

const logDir = './logs'

export const log = (message: string) => {
	const today = new Date();
	const filename = `${logDir}/${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.log`;
	const formattedMessage = `[${today.toString()}] - ${message}`

	if (!fs.existsSync(logDir)){
		fs.mkdirSync(logDir);
	}

	fs.appendFileSync(filename, formattedMessage);
	console.log(formattedMessage);
}