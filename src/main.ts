import { log } from './common/logger';
import { Avalanche } from "avalanche";
import config from "./appConfig.json";

export const mainProgramLoop = async () => {
	const runTill = true;
    const avalanche = new Avalanche(config.apiUrlBase, 80, "https");

	while (runTill) {
		mainFunction(avalanche);
		await sleep(10 * 1000);
	}
}

async function sleep(msec: number) {
	return new Promise(resolve => setTimeout(resolve, msec));
}

function mainFunction(client: Avalanche) {
	

	//check platforms times

	//check dia balance

	//if platform rebase time is soon buy token

	//stake token

	//watch for rebase

	//unstake token

	//convert to dai
}