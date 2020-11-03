import { calculateBulk, itemsFromActorData, stacks, formatBulk, indexBulkItemsById } from '../system/item/bulk.js';
import { calculateEncumbrance } from '../system/item/encumbrance';
import { getContainerMap } from '../system/item/container';
import { PWS, MODULE_TEMPLATE_PATH } from './config.js';


///////////////////////////////////////////////////////////////////////////////.

export const bulkBySize = {
    tiny: 1,
    sm: 3,
    med: 6,
    lg: 12,
    huge: 24,
    grg: 48
};

export function calculateBulkBySize(actor)
{
	const actorSize = actor.data.data?.traits?.size?.value ?? 'med';
	return bulkBySize[actorSize];
}

export function getSpeed(actor)
{
	if (actor.data.data.attributes.speed && actor.data.data.attributes.speed.value)
	{
		return Number(actor.data.data.attributes.speed.value.split(" ")[0]);
	}
	else
	{
		return undefined;
	}
}

///////////////////////////////////////////////////////////////////////////////.

function extendLootSheet()
{
	type ActorSheetConstructor = new (...args: any[]) => ActorSheet;
	const BaseSheetClass: ActorSheetConstructor = CONFIG.Actor.sheetClasses['loot']['pf2e.ActorSheetPF2eLoot'].cls;

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
					members: [],
					mounts: [],
					load: {
						riders: 0,
						cargo: {
							current: 0,
							encumberedAt: 0,
							limit: 0
						},
						total: {
							current: 0,
							encumberedAt: 0,
							limit: 0
						}
					},
					speed: {
						current: 0,
						limit: 0,
					}
				};
				partyData.speed.limit = 120;
				partyData.speed.current = 120;

				// Iterate through items, allocating to containers
				const bulkConfig = {
					ignoreCoinBulk: game.settings.get('pf2e', 'ignoreCoinBulk'),
					ignoreContainerOverflow: game.settings.get('pf2e', 'ignoreContainerOverflow'),
				};

				const carriedBulk = calculateBulk(itemsFromActorData(this.actor.data), stacks, false, bulkConfig);
				partyData.load.cargo.current = carriedBulk[0].normal;

				for (const actor of game.actors.filter( function (a) {
						return ((a.folder != undefined) && (a.folder.data.name === "Party"));
					} )) {
					partyData.members.push({
						id: actor.id,
						name: actor.name,
						mount: actor.getFlag(PWS.MODULE_NAME, "mountId"),
						// @ts-ignore
						bulk: calculateBulkBySize(actor) + calculateBulk(itemsFromActorData(actor.data), stacks, false, bulkConfig)[0].normal,
						speed: {
							current: getSpeed(actor),
							limit: getSpeed(actor)
						}
					});
				}

				for (const actor of game.actors.filter( function (a) {
						return ((a.folder != undefined) && (a.folder.data.name === "Mounts"));
					} )) {
					// @ts-ignore
					let actorLoad = calculateBulk(itemsFromActorData(actor.data), stacks, false, bulkConfig)[0];
					const bonusEncumbranceBulk = 0;
					const bonusLimitBulk = 0;
					const loadCapacity = calculateEncumbrance(
						actor.data.data.abilities.str.mod,
						bonusEncumbranceBulk,
						bonusLimitBulk,
						actorLoad,
						actor.data.data?.traits?.size?.value ?? 'med',  
						);
					
					let cargoCapacity = 0;
					// @ts-ignore
					for ( const item of actor.data.items.filter(function (i) {
						return (i.data?.equipped?.value ?? false) && ((i.data?.bulkCapacity?.value ?? 0) > 0);
					} )) {
						const containerCapacity = item.data?.bulkCapacity?.value ?? 0;
						cargoCapacity = Math.max(cargoCapacity, Math.min(containerCapacity, loadCapacity.limit));
					}
					
					partyData.mounts.push({
						id: actor.id,
						name: actor.name,
						riders: [],
						load: {
							riders: 0,
							cargo: {
								current: 0,
								unencumbered: cargoCapacity,
								encumbered: cargoCapacity,
								limit: cargoCapacity
							},
							current: loadCapacity.bulk,
							encumberedAt: loadCapacity.encumberedAt,
							limit: loadCapacity.limit
						},
						speed: {
							current: getSpeed(actor),
							limit: getSpeed(actor)
						}
					});

					partyData.load.total.encumberedAt += loadCapacity.encumberedAt;
					partyData.load.total.limit += loadCapacity.limit;
				}

				// Account for bulk from mounted riders
				for (const mount of partyData.mounts)
				{
					for (const member of partyData.members)
					{
						if (member.mount === mount.id)
						{
							mount.riders.push(member.id);
							mount.load.riders += member.bulk;
						}
					}
					partyData.load.riders += mount.load.riders;
					mount.load.current += mount.load.riders;
					mount.load.cargo.unencumbered = Math.max(0, Math.min(mount.load.cargo.limit, mount.load.encumberedAt - mount.load.current));
					mount.load.cargo.encumbered = Math.max(0, Math.min(mount.load.cargo.limit, mount.load.limit - mount.load.current));

					partyData.load.cargo.encumberedAt += mount.load.cargo.unencumbered;
					partyData.load.cargo.limit += mount.load.cargo.encumbered;
				}

				// Assign Cargo bulk to mounts
				let cargoBulk = partyData.load.cargo.current;
				while (cargoBulk > 0)
				{
					let bestCandidateIndex = 0;
					let bestInterval = 1;
					for (const [idx, mount] of partyData.mounts.entries())
					{
						const bestMount = partyData.mounts[bestCandidateIndex];

						if ((bestMount.load.cargo.current >= bestMount.load.cargo.encumbered) && ((mount.load.cargo.current - mount.load.cargo.limit) < (bestMount.load.cargo.current - bestMount.load.cargo.limit)))
						{
							bestCandidateIndex = idx;
							bestInterval = 1;
						}
						else if ((bestMount.load.cargo.current >= bestMount.load.cargo.unencumbered) && ((mount.load.cargo.encumbered - mount.load.cargo.current) > (bestMount.load.cargo.encumbered - bestMount.load.cargo.current)))
						{
							bestCandidateIndex = idx;
							bestInterval = mount.load.cargo.encumbered - mount.load.cargo.current;
						}
						else if((mount.load.cargo.unencumbered - mount.load.cargo.current) > (bestMount.load.cargo.unencumbered - bestMount.load.cargo.current))
						{
							bestCandidateIndex = idx;
							bestInterval = mount.load.cargo.unencumbered - mount.load.cargo.current;
						}
					}

					bestInterval = Math.min(bestInterval, cargoBulk);
					cargoBulk -= bestInterval;
					partyData.mounts[bestCandidateIndex].load.cargo.current += bestInterval;
				}

				// Compute total load information				
				partyData.load.total.current = partyData.load.riders + partyData.load.cargo.current;

				// Compute party speed
				for (const mount of partyData.mounts)
				{
					mount.load.current += mount.load.cargo.current;
					if (mount.speed.limit)
					{
						mount.speed.current = (mount.load.current > mount.load.encumberedAt) ? mount.speed.limit - 10 : mount.speed.limit;
						partyData.speed.limit = Math.min(partyData.speed.limit, mount.speed.limit);
						partyData.speed.current = Math.min(partyData.speed.current, mount.speed.current);
					}
				}
				renderData['party'] = partyData;

                resolve(renderData);
            });
        }

        activateListeners(html) {
            super.activateListeners(html);

            html.find('select.partysheet-select-mount').on('change', (event) => {
                this.onMountSelect(event);
            });
        }

        async _onDrop(event) {
			return super._onDrop(event);
		}
		
		async onMountSelect(event) {
			const memberId = event.currentTarget.attributes["member-id"].nodeValue;
			const mountId = event.currentTarget.value;
			game.actors.get(memberId).setFlag(PWS.MODULE_NAME, "mountId", mountId);
			//super.submit({});
			super.render(false, {});
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