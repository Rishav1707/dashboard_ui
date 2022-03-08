import React, {useState, useEffect, useCallback} from 'react';
import {AllStrats, AllVaults} from  '../ethereum/EthHelpers';
import HarvestMultiple from  '../ethereum/HarvestMultiple';
import useRPCProvider from '../context/useRpcProvider';
import RatioAdjust from './RatioAdjusters';
import {GetExplorerLink} from '../utils/utils';
import HistoricReports from '../components/HistoricReports';
import {setupTenderly, TenderlySim} from '../ethereum/TenderlySim';
import ShowEvents from '../components/ShowEvents';

function SingleVaultPage({value}){
	const {fantomProvider, defaultProvider} = useRPCProvider();
	let provider = value.chain == 250 ? fantomProvider : defaultProvider;
	const [allS, setAlls] = useState([]);
	const [historicHarvests, setHistoricHarvests] = useState([]);
	const [vault, setVault] = useState({});
	const [nonce, setNonce] = useState(0);
	const [harvestedS, setHarvested] = useState([]);
	const [showRatio, toggleRatios] = useState(false);
	const [zeros, setStateZeros] = useState({});
  

	console.log('inputting ', value);

	//Handle the setAll
	// const	onSetAll = useCallback(async () => {
	// 	console.log('sart');
	// 	const vlt = await AllVaults(value, provider);
	// 	console.log(vlt);
	// 	setVault(vlt);
	// 	const	_all = await AllStrats(vlt, provider);
	// 	console.log('changing!');
	// 	console.log(_all);
	// 	setAlls(_all || []);
	// }, [value, provider]);
	// useEffect(() => onSetAll(), [onSetAll]);

	useEffect(() => {
		if(value.address){
			AllVaults(value, provider).then(x => {
				setVault(x);
			});
		}
		
	}, [value, provider]);

	useEffect(() => {

		if(vault.address){
			AllStrats(vault, provider).then(y => {			
				setAlls(y || []);
			});
		}

	}, [vault, provider]);

	function runSimZero(strat){
		let blocks = [];
		let extended1 = JSON.parse(JSON.stringify(vault));
		
		//updateDebtRatio
		let extended = JSON.parse(JSON.stringify(vault));
		let block = vault;
		extended.block = block;
		extended.contract = vault.contract;
		extended.function = vault.contract.interface.fragments.find(x => x.name === 'updateStrategyDebtRatio');
		let s = [];
		s['asd'] = {};
		s['asd']['strategy'] = strat.address;
		s['asd']['debtRatio'] = '0';
		extended.inputs = s['asd'];
		
		blocks.push(extended);

		//harvest
		
		let block1 = strat;
		extended1.block = block1;
		extended1.contract = vault.contract;
		
		extended1.function = strat.contract.interface.fragments.find(x => x.name === 'harvest');
		
		blocks.push(extended1);


		
		
		
		setupTenderly(provider.network.chainId).then(tenderlyProvider =>{
			TenderlySim(blocks, tenderlyProvider).then(x =>{
				console.log(x);
				setStateZeros(currentValues => {
					currentValues[strat.address] = x[1];
					return currentValues;
				});
				setNonce(nonce+1);
			});
		});

	}
  
	//Handle the button to harvest all
	const	onHarvestMultiple = useCallback(async () => {
		const tenderly = await setupTenderly(provider.network.chainId);
		const	_harvested = await HarvestMultiple(allS, vault, tenderly);
		setHarvested(_harvested || []);
	}, [allS, vault, provider.network.chainId]);

	function showHistoricHarvests(strat){

		try{
			
			setHistoricHarvests(
				currentValues => {
					currentValues[strat] = true;
					return currentValues;
				
				});

			setNonce(nonce+1);
		}catch{console.log('eth failed');}

	}

	const showApr = (strat) => {
		if(!strat.succeded){
			return;
		}

		let profit = strat.paramsAfter.totalGain - strat.beforeGain;
		let loss = strat.paramsAfter.totalLoss - strat.beforeLoss;
		let percent = 0;
		if (strat.beforeDebt > 0) {
			if (loss > profit){
				percent = -1 * loss / strat.beforeDebt; 
			} else {
				percent = profit / strat.beforeDebt;
			}
		}
		let over_year = (100*percent * 8760 / strat.lastTime).toLocaleString(undefined, {maximumFractionDigits:2});    
		return ' APR ' + over_year + '% ';
	};

	if(allS.length == 0) {
		return(<div>
			{vault.address && <div>{vault.name}{' - '}{vault.version}{' - '}<a target={'_blank'} href={GetExplorerLink(provider.network.chainId, value.address)} rel={'noreferrer'}> {value.address}</a>{' - '}{(vault.debtRatio/100).toLocaleString(undefined, {maximumFractionDigits:2})}{'% Allocated - Free Assets: '}{((vault.totalAssets - vault.totalDebt) / (10 ** vault.token.decimals)).toLocaleString(undefined, {maximumFractionDigits:2})}</div>}
			<div>{'loading strats...'}</div></div>);
	}
    
	console.log(zeros);
	// console.log(vault);
	// console.log(harvestedS);

	const listItems = allS.map((strat) => (
		<div key={strat.address}> 
			<br />
			<div>{'Strat: '}{strat.name}{' - '}<a target={'_blank'} href={GetExplorerLink(provider.network.chainId, strat.address)} rel={'noreferrer'}>{strat.address}</a><button onClick={() => runSimZero(strat)}>{'Sim 0'}</button></div>
			{zeros[strat.address] &&  <a target={'_blank'} rel={'noreferrer'} href={zeros[strat.address].tenderlyURL}> {(zeros[strat.address].success ? ' succeeded ' : 'failed ')} </a>}
			{(zeros[strat.address] && zeros[strat.address].result) && <ShowEvents events={zeros[strat.address].result.events} />}
			<div>{'Lastharvest: '}{strat.lastTime.toLocaleString(undefined, {maximumFractionDigits:2})}{'h - Real ratio: '}{(100*strat.beforeDebt/strat.vaultAssets).toLocaleString(undefined, {maximumFractionDigits:2})}{'% - Desired ratio: '}{(strat.debtRatio/100).toLocaleString(undefined, {maximumFractionDigits:2})}{'% '}</div>
			<div>{harvestedS.length > 0 ? (strat.succeded ? showApr(strat) : 'Failed Harvest ')  : ''} <a target={'_blank'} href={strat.tenderlyURL} rel={'noreferrer'}>{harvestedS.length > 0 && 'Tenderly Link'} </a></div>
			{historicHarvests[strat.address] && <HistoricReports strategy={strat} />}
			{!historicHarvests[strat.address] &&<button onClick={() => showHistoricHarvests(strat.address)}>{'Show historic harvests'}</button>}
		</div>
	));
	
	return(
		<div>
			
			<button onClick={onHarvestMultiple}>{' Harvest All?'}</button>
			
			<div>{vault.name}{' - '}{vault.version}{' - '}<a target={'_blank'} href={GetExplorerLink(provider.network.chainId, value.address)} rel={'noreferrer'}> {value.address}</a>{' - '}{(vault.debtRatio/100).toLocaleString(undefined, {maximumFractionDigits:2})}{'% Allocated - Free Assets: '}{((vault.totalAssets - vault.totalDebt) / (10 ** vault.token.decimals)).toLocaleString(undefined, {maximumFractionDigits:2})}</div>
			{console.log('sda2')}
			{console.log(vault)}
			{listItems}

			<div>{showRatio && <RatioAdjust strats={allS} />}</div>
			<div><button onClick={() => toggleRatios(!showRatio)}>{' Adjust Ratios?'}</button></div>
		</div>
	); 
}



export default SingleVaultPage;