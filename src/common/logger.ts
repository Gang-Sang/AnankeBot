import * as fs from 'fs';

const logDir = './logs'
const rebaseRecord = './records'

export const log = (message: string) => {
	const today = new Date();
	const filename = `${logDir}/${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.log`;
	const formattedMessage = `[${today.toString()}] - ${message}`

	if (!fs.existsSync(logDir)){
		fs.mkdirSync(logDir);
	}

	fs.appendFileSync(filename, `${formattedMessage}\r\n`);
	console.log(formattedMessage);
}

export const logRebaseComplete = (platformName: string, stableAmountSpent: string, stableAmountRecieved: string, stableNumOfDecimals: number) => {
	const spent = BigInt(stableAmountSpent);
	const recieve = BigInt(stableAmountRecieved);

	//convert bigInts to decimals with 4 digits of persision
	const spentConverted = Number((spent * 10000n) / BigInt(Math.pow(10, stableNumOfDecimals))) / 10000;
	const recieveConverted = Number((recieve * 10000n) / BigInt(Math.pow(10, stableNumOfDecimals))) / 10000;
	const amountDiff = recieveConverted - spentConverted;
	const percDiff = (amountDiff / spentConverted) * 100;

	if (!fs.existsSync(rebaseRecord)){
		fs.mkdirSync(rebaseRecord);
	}

	const today = new Date();
	const filename = `${rebaseRecord}/${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.cvs`;
	const formattedMessage = `${today.toString()},${platformName},${spentConverted},${recieveConverted},${amountDiff},${percDiff}`;

	fs.appendFileSync(filename, `${formattedMessage}\r\n`);
}