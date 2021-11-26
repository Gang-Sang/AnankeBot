import Web3 from 'web3';
import config from '../appConfig.json';
import { getStakingAbi } from '../abi/abiFactory';
import { log } from '../common/logger';

export interface Platform {
	id: number;
	name: string;
	stakingContract: string;
	tokenContract: string;
	endBlock: number;
	blocksToRebase: number;
}

export const getPlatformToExecute = async (web3: Web3, currentBlock: number) => {
	const platforms = await getValidPlatforms(web3, currentBlock);

	if(!platforms || platforms.length == 0) { 
		return null; 
	}

	const withinBlockLimit = platforms.filter(p => p.blocksToRebase > config.numOfBlocksMin);

	if(withinBlockLimit.length > 0 && withinBlockLimit[0].blocksToRebase < config.numOfBlockPreBuy) {
		return withinBlockLimit[0];
	}

	if(withinBlockLimit.length > 0 && config.verbose) {
		log(`No Platform to buy. Closest is ${withinBlockLimit[0].name} at block ${withinBlockLimit[0].blocksToRebase}`);
	}
	
	return null;
}

export const getValidPlatforms = async (web3: Web3, currentBlock: number) => {
	const platforms : Platform[] = [];

	for(let i = 0; i < config.platforms.length; i++) {
		const platform = config.platforms[i]
		const abi = getStakingAbi(platform.id);
		if(!abi) { return; }
		const myContract = new web3.eth.Contract(abi, platform.stakingContract);
		const epochResult = await (myContract as any).methods?.epoch().call();

		const distribute = parseInt(epochResult.distribute);
		const endBlock = parseInt(epochResult.endBlock);

		//TODO: add conditions to check reward %
		//TODO: cache results to save api calls when we know we're not playing this block
		if(distribute > 0 && endBlock > currentBlock)
		{
			platforms.push({
				...platform,
				endBlock: epochResult.endBlock,
				blocksToRebase: epochResult.endBlock - currentBlock
			})
		}
	}

	platforms.sort((a,b) => (a.blocksToRebase - b.blocksToRebase));
	return platforms;
}