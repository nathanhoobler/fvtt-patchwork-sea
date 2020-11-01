import { PWS } from './config.js';
const MODULE_TEMPLATE_PATH = `modules/${PWS.MODULE_NAME}/templates`;

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
            options.classes = [...options.classes, 'pf2e-toolbox', 'loot-app'];

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

				let carriedLoad = 0;

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

				for (const a of porterActors)
				{
					
				}

				for (const a of partyActors)
				{
					
				}

				for (const item of this.actor.items.entries) {
					const weightValue = item.data.data.weight.value;
					const itemWeight =
						(weightValue ==='-')	? 0 : 
						(weightValue === 'L') 	? 0.1 : parseInt(weightValue);
					const itemQuantity = item.data.data.quantity.value;
					carriedLoad += itemWeight * itemQuantity;
				}

				partyData.load.unencumbered.max = 18;
				partyData.load.unencumbered.current = Math.min(carriedLoad, partyData.load.unencumbered.max);
				carriedLoad = carriedLoad - partyData.load.unencumbered.current;
				
				partyData.load.encumbered.max = 10;
				partyData.load.encumbered.current = carriedLoad;

				partyData.speed.max = 40;
				partyData.speed.current = 30;

				renderData['party'] = partyData;

                resolve(renderData);
            });
        }

        activateListeners(html) {
            super.activateListeners(html);

            html.find('select').on('input', (event) => {
				// @ts-ignore
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