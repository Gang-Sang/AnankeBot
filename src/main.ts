import Web3 from 'web3';
import { Mutex } from 'async-mutex';
import { log } from './common/logger';
import config from './appConfig.json';
import { getPlatformToExecute } from './main/platforms';
import { getBalace } from './main/erc20';

const mutex = new Mutex();
let currentlyRunning = false;

export const mainProgramLoop = async () => {
	const runTill = true;
	const web3 = new Web3(config.apiUrlBase);

	while (runTill) {
		if (await isCurrentlyRunning()) {
			await sleep(10 * 1000);
			continue;
		}

		mainFunction(web3);
		await sleep(10 * 1000);
	}
}

async function sleep(msec: number) {
	return new Promise(resolve => setTimeout(resolve, msec));
}

async function SetCurrentlyRunning(value: boolean) {
	const release = await mutex.acquire();
	try {
		currentlyRunning = value;
	} finally {
		release();
	}
}

async function isCurrentlyRunning() : Promise<boolean> {
	const release = await mutex.acquire();
	try {
		return currentlyRunning;
	} finally {
		release();
	}
}

async function mainFunction(web3: Web3) {
	await SetCurrentlyRunning(true);

	const currentBlock = await web3.eth.getBlockNumber();
	log(`current block-${currentBlock}`);

	const executePlatform = getPlatformToExecute(web3, currentBlock);
	if(!executePlatform) { return; }

	//start the buy process
	const daiBalance = await getBalace(web3, config.daiTokenAddress);

	if (daiBalance <= 0 ) {
		log(`dai balance not enough to trade, exiting. Balance - ${daiBalance}`);
		return;
	}

	//trade dai

	
	//stake token

	//watch for rebase

	//unstake token

	//convert to dai
	
	await SetCurrentlyRunning(false);
}


