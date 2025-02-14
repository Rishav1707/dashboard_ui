import React from 'react';
import {BsStarFill} from 'react-icons/bs';
import {useFilter} from './useFilter';
import config from '../../config';
import {Chip} from '../controls';

export default function Chips() {
	const {chips, setChips} = useFilter();

	function toggle(chip) {
		return () => {
			setChips(chips => {
				return {...chips, [chip]: !chips[chip]};
			});
		};
	}

	return <div className={'flex flex-row items-center gap-3'}>
		<Chip icon={BsStarFill} onClick={toggle('favorites')} hot={chips.favorites} />
		<Chip label={'curve'} onClick={toggle('curve')} hot={chips.curve} />
		<Chip label={'factory'} onClick={toggle('factory')} hot={chips.factory} />
		{config.chains.map(chain => 
			<Chip key={chain.id} label={chain.name} onClick={toggle(chain.name)} hot={chips[chain.name]} />
		)}
	</div>;
}