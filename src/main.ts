import Web3 from 'web3';
import { Mutex } from 'async-mutex';
import { log } from './common/logger';
import config from './appConfig.json';
import { Platform, getPlatformToExecute } from './main/platforms';
import { getBalace } from './main/erc20';
import { getLiquidityReserves, swapDaiForTokens } from './main/spookySwap';

const mutex = new Mutex();
let currentlyRunning = false;

export const mainProgramLoop = async () => {
	const runTill = true;
	const web3 = new Web3(config.apiUrlBase);
	web3.eth.defaultAccount = config.publicKey;

	while (runTill) {
		if (await isCurrentlyRunning()) {
			await sleep(10 * 1000);
			continue;
		}

		await mainFunction(web3);
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

	const executePlatform = await getPlatformToExecute(web3, currentBlock);
	if(!executePlatform) { return; }

	log(`Starting buying cycle for ${executePlatform.name}`);

	//start the buy process
	const daiBalance = await getBalace(web3, config.daiTokenAddress);
	if (daiBalance <= 0 ) {
		log(`dai balance not enough to trade, exiting. Balance - ${daiBalance}`);
		return;
	}

	//check rugpull metrics
	const reserves = await getLiquidityReserves(web3, executePlatform);
	if(reserves[1] < 1000000)
	{
		log(`Dai in LP balance too low, might be a rugpull. Dai Liquidity ${reserves[1]}`);
		return;
	}

	//trade dai
	if(await buyDai(web3, executePlatform, 100, reserves)) {
		log('Dai buy transaction sucessful');
	} else {
		log('Dai buy transaction failed');
		return;
	}

	//stake token
                                                                                               
	//watch for rebase

	//unstake token

	//convert to dai
	
	//await SetCurrentlyRunning(false);
}

const buyDai = async (web3: Web3, platform: Platform, daiAmount: number, reserves: number[]) => {
	if(config.verbose) { log(`Apptempt to buy ${daiAmount} dai`); }

	const loopLimit = 60;
	let loops = 0;
	let reciept = await swapDaiForTokens(web3, platform, daiAmount, reserves);

	if(config.verbose) {
		log(`Dai buy transaction created - hash - ${reciept.transactionHash}`);
	}
	if(config.verbose) {
		log(`current reciept - ${JSON.stringify(reciept)}`);
	}


	while (loops < loopLimit) {
		log('loop');
		await sleep(10 * 1000);
		log('after sleep');
		reciept = await web3.eth.getTransactionReceipt(reciept.transactionHash);

		if(config.verbose) {
			log(`current reciept - ${JSON.stringify(reciept)}`);
		}

		if(reciept?.blockNumber) {
			if(reciept.status == true) {
				return true;
			} else {
				
				return false;
			}
		}
		loops++;
	}

	log('Dai buy transaction status unknown. Exiting, manually check transaction');
	throw 'Dai buy transaction status unknown';
}
