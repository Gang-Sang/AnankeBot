import spaStakingAbi from './spaStaking.json';

export const getStakingAbi = (id: number) => {
	switch (id) {
	case 1:
		return spaStakingAbi;
	default:
		return null;
	}
}
