import Web3 from 'web3';
import { log } from './common/logger';
import { getBalace } from './common/erc20';
import config from './appConfig.json';
import { getPlatformToExecute } from './main/platforms';
import { getLiquidityReserves } from './main/spookySwap';
import { executeBuySell } from './main/buySellRebase';

export const mainProgramLoop = async () => {
	const web3 = new Web3(config.apiUrlBase);
	web3.eth.defaultAccount = config.publicKey;

	while (true) {
		await mainFunction(web3);
		await sleep(30 * 1000);
	}
}

async function sleep(msec: number) {
	return new Promise(resolve => setTimeout(resolve, msec));
}

async function mainFunction(web3: Web3) {
	const currentBlock = await web3.eth.getBlockNumber();
	log(`current block-${currentBlock}`);

	const executePlatform = await getPlatformToExecute(web3, currentBlock);
	if(!executePlatform) { return; }

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

	await executeBuySell(web3, executePlatform, reserves);
}

