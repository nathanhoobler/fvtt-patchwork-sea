import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../system/item/bulk.js';
import { calculateEncumbrance } from '../system/item/encumbrance';
import { getContainerMap } from '../system/item/container';
import { PWS } from './config.js';
const MODULE_TEMPLATE_PATH = `modules/${PWS.MODULE_NAME}/templates`;


///////////////////////////////////////////////////////////////////////////////.

export const bulkBySize = {
    tiny: 1,
    sm: 3,
    med: 6,
    lg: 12,
    huge: 24,
    grg: 48
};

///////////////////////////////////////////////////////////////////////////////.

function extendLootSheet()
{
	type ActorSheetConstructor = new (...args: any[]) => ActorSheet;
	const BaseSheetClass: ActorSheetConstructor = CONFIG.Actor.sheetClasses['loot']['pf2e.ActorSheetPF2eLoot'].cls;
	//const BaseSheetClass = CONFIG.Actor.sheetClasses['loot']['pf2e.ActorSheetPF2eLoot'].cls;

    return class PartySheet extends BaseSheetClass {

        static get defaultOptions() {
			// @ts-ignore
            const options = super.defaultOptions;
            options.classes = options.classes ?? [];
            options.classes = [...options.classes, 'patchwork-sea', 'party-sheet'];

            options.tabs = options.tabs ?? [];
            return options;
        }

        get template() {
            return `${MODULE_TEMPLATE_PATH}/party-sheet.html`;
        }

        // @ts-ignore
        getData() {
            return new Promise(async (resolve) => {
                const renderData = super.getData();

				renderData['flags'] = this.actor.data.flags;
				
				let partyData = {
					load: {
						unencumbered: {
							current: 0,
							max: 0
						},
						encumbered: {
							current: 0,
							max: 0
						}
					},
					speed: {
						current: 0,
						max: 0,
					}
				};

				// Iterate through items, allocating to containers
				const bulkConfig = {
					ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
					ignoreContainerOverflow: game.settings.get('pf2e', 'ignoreContainerOverflow'),
				};

				const carriedBulk = calculateBulk(itemsFromActorData(this.actor.data), stacks, false, bulkConfig);
				let carriedLoad = carriedBulk[0].normal;
				partyData.speed.max = 120;

				const partyActors = [];
				const porterActors = [];

				for (const a of game.actors.entities) {
					if (a.folder)
					{
						const folderName = a.folder.data.name;
						if (folderName === 'Party')
							partyActors.push(a);
						if (folderName == 'Mounts')
							porterActors.push(a);
					}
				}

				let riderLoad = [];
				let totalRiderLoad = 0;
				for (const a of partyActors)
				{
					const actorSize = a.data.data?.traits?.size?.value ?? 'med';
					const actorLoad = bulkBySize[actorSize] + calculateBulk(itemsFromActorData(a.data), stacks, false, bulkConfig)[0].normal;
					totalRiderLoad += actorLoad;
					riderLoad.push(actorLoad);
				}

				let currentRiderIndex = 0;
				for (const a of porterActors)
				{
					let actorLoad = calculateBulk(itemsFromActorData(a.data), stacks, false, bulkConfig)[0].normal;
					const bonusEncumbranceBulk = 0;
					const bonusLimitBulk = 0;
					const loadCapacity = calculateEncumbrance(
						a.data.data.abilities.str.mod,
						bonusEncumbranceBulk,
						bonusLimitBulk,
						(currentRiderIndex < riderLoad.length) ? actorLoad[0] + riderLoad[currentRiderIndex] : actorLoad[0],
						a.data.data?.traits?.size?.value ?? 'med',  
					  );

					if (currentRiderIndex < riderLoad.length)
					{
						actorLoad += riderLoad[currentRiderIndex];
						const SADDLEBAG_CAPACITY = 6;
						const unencumberedCapacity = Math.min(SADDLEBAG_CAPACITY, Math.max(0, loadCapacity.encumberedAt - actorLoad));
						partyData.load.unencumbered.max += unencumberedCapacity;
						partyData.load.encumbered.max += Math.min(SADDLEBAG_CAPACITY - unencumberedCapacity, loadCapacity.limit - loadCapacity.encumberedAt);
					}
					else
					{
						partyData.load.unencumbered.max += loadCapacity.encumberedAt;
						partyData.load.encumbered.max += loadCapacity.limit - loadCapacity.encumberedAt;
					}
					currentRiderIndex += 1;

					if (a.data.data.attributes.speed && a.data.data.attributes.speed.value)
					{
						const actorSpeed = Number(a.data.data.attributes.speed.value.split(" ")[0]);
						partyData.speed.max = Math.min(partyData.speed.max, actorSpeed);
					}
				}

				//carriedLoad += totalRiderLoad;

				partyData.load.unencumbered.current = Math.min(carriedLoad, partyData.load.unencumbered.max);
				carriedLoad = carriedLoad - partyData.load.unencumbered.current;
				partyData.load.encumbered.current = carriedLoad;
				partyData.speed.current = (partyData.load.encumbered.current > 0) ? partyData.speed.max - 10 : partyData.speed.max;

				renderData['party'] = partyData;

                resolve(renderData);
            });
        }

        activateListeners(html) {
            super.activateListeners(html);

            html.find('select').on('input', (event) => {
                this._onSubmit(event);
            });
        }

        async _onDrop(event) {
			return super._onDrop(event);
        }
    };
}


///////////////////////////////////////////////////////////////////////////////.

export const setupExplorationApp = function()
{
	const PartySheetClass = extendLootSheet();
	Actors.registerSheet(
		PWS.MODULE_NAME,
		PartySheetClass,
		{ label: 'Exploration Party', types: ['loot'], makeDefault: 'false' }
	  );
}