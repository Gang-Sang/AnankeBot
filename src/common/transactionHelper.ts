import Web3 from 'web3';
import config from '../appConfig.json';
import { TransactionConfig } from 'web3-core';

export const sendContractCall = async (web3: Web3, methodSig: any, contractAddress: string) => {
	const callData = methodSig.encodeABI();
	const gasEstimate = Math.floor((await methodSig.estimateGas({ from : config.publicKey })) * 1.25).toString();
	const gasPrice = Math.floor(parseFloat(await web3.eth.getGasPrice()) * 1.1).toString();

	const transaction: TransactionConfig = {
		from: config.publicKey,
		to: contractAddress,
		data: callData,
		value: '0',
		gasPrice: gasPrice,
		gas: gasEstimate
	};
	const signTx = await web3.eth.accounts.signTransaction(transaction, config.privateKey);
	const rawTx: string = signTx.rawTransaction as string;

	return await web3.eth.sendSignedTransaction(rawTx);
}