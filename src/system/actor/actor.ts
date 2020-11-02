/* global ChatMessage, Roll, getProperty, isObjectEmpty, ui, CONST */
/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */

export const SKILL_DICTIONARY = Object.freeze({
  acr: 'acrobatics',
  arc: 'arcana',
  ath: 'athletics',
  cra: 'crafting',
  dec: 'deception',
  dip: 'diplomacy',
  itm: 'intimidation',
  med: 'medicine',
  nat: 'nature',
  occ: 'occultism',
  prf: 'performance',
  rel: 'religion',
  soc: 'society',
  ste: 'stealth',
  sur: 'survival',
  thi: 'thievery'
});

export const SKILL_EXPANDED = Object.freeze({
  acrobatics: { ability: 'dex', shortform: 'acr' },
  arcana: { ability: 'int', shortform: 'arc' },
  athletics: { ability: 'str', shortform: 'ath' },
  crafting: { ability: 'int', shortform: 'cra' },
  deception: { ability: 'cha', shortform: 'dec' },
  diplomacy: { ability: 'cha', shortform: 'dip' },
  intimidation: { ability: 'cha', shortform: 'itm' },
  medicine: { ability: 'wis', shortform: 'med' },
  nature: { ability: 'wis', shortform: 'nat' },
  occultism: { ability: 'int', shortform: 'occ' },
  performance: { ability: 'cha', shortform: 'pfr' },
  religion: { ability: 'wis', shortform: 'rel' },
  society: { ability: 'int', shortform: 'soc' },
  stealth: { ability: 'dex', shortform: 'ste' },
  survival: { ability: 'wis', shortform: 'sur' },
  thievery: { ability: 'dex', shortform: 'thi' }
});

const SUPPORTED_ROLL_OPTIONS = Object.freeze([
  'all',
  'attack-roll',
  'damage-roll',
  'saving-throw',
  'fortitude',
  'reflex',
  'will',
  'perception',
  'initiative',
  'skill-check',
]);
