import type { NeonHue } from '../city/languages';

/**
 * The limited palette: deep navy and indigo shadows, warm window light,
 * and neon accents. Every pixel the renderer draws comes from here.
 */

/** Sky gradient stops by height above the ground (world y). */
export const SKY_STOPS: ReadonlyArray<readonly [number, string]> = [
  [-420, '#05071a'],
  [-300, '#080b24'],
  [-210, '#0c1030'],
  [-145, '#12173c'],
  [-95, '#1a1c48'],
  [-55, '#252156'],
  [-25, '#36265d'],
  [0, '#482a62'],
];

export const SKY = {
  zenith: '#05071a',
  starDim: '#4e5888',
  star: '#aab5e8',
  starBright: '#eef2ff',
  moon: '#f2e9cc',
  moonShade: '#d9cca5',
  moonCrater: '#e4d8b4',
  moonHaloInner: '#2f3584',
  moonHaloOuter: '#20266a',
  moonGlow: '#8f9be0',
  cloud: '#1f2556',
  cloudLit: '#323a74',
  cloudEdge: '#282f66',
} as const;

export const SKYLINE = {
  body: '#0f1336',
  rim: '#161b45',
  window: ['#4b4570', '#7a5f55', '#3e5a7a'],
  aviation: '#ff4a4a',
  haze: '#2b2459',
} as const;

export const MIDGROUND = {
  body: '#131838',
  bodyAlt: '#171c42',
  rim: '#1f2550',
  window: ['#a8783e', '#c08a4a', '#5d7aa8', '#8a6a9a'],
  sign: ['#9a3a74', '#2f7f96', '#a07a32', '#7a4aa8'],
  rail: {
    deckTop: '#3d4378',
    deck: '#2a2f58',
    deckShade: '#1c2045',
    pillar: '#1d2147',
    pillarLit: '#272c58',
    mast: '#363b68',
    wire: '#252a52',
  },
  haze: '#1f2152',
} as const;

export interface Material {
  base: string;
  shade: string;
  light: string;
  line: string;
  trim: string;
}

export const MATERIALS: Readonly<Record<'concrete' | 'tile' | 'brick' | 'teal' | 'pale' | 'glass', Material>> = {
  concrete: { base: '#2a2e50', shade: '#22263f', light: '#353a62', line: '#1b1e37', trim: '#454b78' },
  tile: { base: '#3a3350', shade: '#2f2942', light: '#463e5e', line: '#272236', trim: '#544a6e' },
  brick: { base: '#3b2b3c', shade: '#302231', light: '#4a3649', line: '#251a27', trim: '#5a4256' },
  teal: { base: '#24364a', shade: '#1d2c3e', light: '#2e4359', line: '#172434', trim: '#3a5470' },
  pale: { base: '#43476a', shade: '#383b58', light: '#50547a', line: '#2e3049', trim: '#60658a' },
  glass: { base: '#1a2143', shade: '#141a37', light: '#253058', line: '#10152c', trim: '#33407a' },
};

export const ABANDONED: Material = { base: '#1c1e31', shade: '#16182a', light: '#23263c', line: '#111322', trim: '#2b2e46' };

export const WINDOW = {
  warm: '#ffc96b',
  warmHi: '#ffe7a6',
  warmLo: '#d98b3c',
  cool: '#cfe8ff',
  coolHi: '#f2f9ff',
  coolLo: '#89b2db',
  tv: '#86a9ff',
  dark: '#141832',
  darkHi: '#272e57',
  broken: '#2c3048',
  curtain: '#e6a35a',
} as const;

export const SHOP = {
  interior: '#ffd892',
  interiorHi: '#fff0c8',
  shelf: '#c08848',
  shelfItems: ['#e8524a', '#4aa3e8', '#f2c94a', '#62c27a', '#e87ab0'],
  frame: '#151829',
  shutter: '#3a3d56',
  shutterLine: '#2c2e45',
  shutterHi: '#474a66',
  awnings: [
    ['#c23b3b', '#e8dcc8'],
    ['#2f7a5a', '#e8dcc8'],
    ['#2c4f9a', '#e8dcc8'],
    ['#b8742c', '#3a2a24'],
  ] as const,
  lobby: '#9dbde0',
  lobbyHi: '#cfe4f7',
  board: '#3a3330',
  boardLine: '#2a2422',
} as const;

export const ROOF = {
  tank: '#7d829e',
  tankHi: '#9a9fbb',
  tankShade: '#5b6080',
  metal: '#4c5070',
  metalHi: '#6a6f92',
  rail: '#3e4266',
  ac: '#6d7290',
  acShade: '#4e526e',
  hutLight: '#ffe2a0',
} as const;

export const WOOD = {
  base: '#4a2c1d',
  shade: '#3a2216',
  light: '#653d26',
  dark: '#24150e',
  trim: '#7d4f30',
  paper: '#f2c27a',
  paperHi: '#ffdca0',
  plaster: '#3e3a4e',
  tile: '#262838',
  tileHi: '#3a3d55',
  tileRidge: '#4a4d66',
} as const;

export const NOREN = [
  { cloth: '#283a8a', hi: '#3550b0' },
  { cloth: '#9c2a2a', hi: '#c23b33' },
  { cloth: '#2d2a2e', hi: '#45404a' },
] as const;
export const NOREN_MARK = '#ece6d6';

export const LANTERN = {
  body: '#e2382e',
  hi: '#ff7a52',
  lo: '#9e1f1f',
  cap: '#1a1414',
  glow: '#ff6a3a',
  off: '#5a2a2a',
  offLo: '#3e1e22',
} as const;

export const STREET_COLORS = {
  sidewalk: '#252842',
  sidewalkHi: '#2b2f4c',
  joint: '#1e2138',
  curb: '#4a4e75',
  curbShade: '#33365a',
  road: '#13152a',
  roadGrain: '#181b32',
  line: '#77756b',
  lineBright: '#a9a58f',
  crosswalk: '#b9b5a1',
  crosswalkWorn: '#8d8a7c',
  sideStreet: '#191b33',
  poolWarm: '#4a3a46',
  poolWarmHi: '#5e4850',
  poolCool: '#323c66',
  poolCoolHi: '#3d4a7a',
} as const;

export const PROPS = {
  vending: [
    { body: '#dfe5ee', shade: '#aeb6c8', dark: '#7a8298' },
    { body: '#c9343c', shade: '#9c252d', dark: '#6a1a20' },
    { body: '#2e5cc4', shade: '#22479a', dark: '#17306a' },
  ],
  vendingPanel: '#fff4d6',
  vendingPanelLo: '#e9d9b0',
  pole: '#5a5e7a',
  poleLit: '#6c7090',
  poleShade: '#43475f',
  insulator: '#c9ccd8',
  transformer: '#6a6e88',
  lamp: '#eaf6ff',
  guardYellow: '#e8c23a',
  guardBlack: '#1a1a22',
  wire: '#080a17',
  plate: '#2f5aa8',
  bikeFrame: ['#c0c4d8', '#c9343c', '#2f6fbf', '#e8c23a'],
  bikeWheel: '#7c809c',
  bikeDark: '#2a2d44',
  basket: '#9aa0b8',
  pot: '#8a4a32',
  potShade: '#6a3624',
  leaf: '#1f5a46',
  leafHi: '#2f7a5c',
  crateYellow: '#e0a830',
  crateGreen: '#3a8a4a',
  crateShade: '#9a6a1a',
  signalBox: '#22253a',
  signalGo: '#35f0c0',
  signalOff: '#3a3d50',
  signalStop: '#ff4a3a',
} as const;

export const KONBINI = {
  wall: '#d9dde8',
  wallShade: '#b3b8cc',
  stripeA: '#1fa39a',
  stripeB: '#f2b43a',
  interior: '#d9f1fa',
  interiorHi: '#f4fdff',
  shelf: '#8fa3bf',
  items: ['#e8524a', '#4aa3e8', '#f2c94a', '#62c27a', '#e87ab0', '#ff9a3a'],
  frame: '#8c93aa',
  glow: '#d8f4ff',
} as const;

export const SHRINE = {
  torii: '#d6452f',
  toriiHi: '#f06a4a',
  toriiShade: '#9c2c22',
  kasagi: '#1a1820',
  stone: '#6a6d80',
  stoneHi: '#8a8da0',
  stoneShade: '#4a4d60',
  tree: '#13302e',
  treeMid: '#1b403b',
  treeHi: '#245048',
  shrineWood: '#5a3a26',
  shrineRoof: '#2a2c3c',
  light: '#ffe0a8',
} as const;

export interface NeonColors {
  /** Lit tube / glyph color. */
  tube: string;
  /** Brightest highlight. */
  core: string;
  /** Color of the soft glow. */
  glow: string;
  /** Unlit or broken tube. */
  dim: string;
  /** Lightbox face. */
  box: string;
  /** Text on a lightbox. */
  boxText: string;
}

export const NEON: Readonly<Record<NeonHue, NeonColors>> = {
  pink: { tube: '#ff5fae', core: '#ffd3ea', glow: '#ff3d9a', dim: '#4a2440', box: '#ffd9ec', boxText: '#b0145e' },
  cyan: { tube: '#45e4ff', core: '#dcfbff', glow: '#2bd4ff', dim: '#1f3a4a', box: '#d6f7ff', boxText: '#0b6c8f' },
  amber: { tube: '#ffbe45', core: '#fff0c4', glow: '#ffae2b', dim: '#4a3a24', box: '#fff1c9', boxText: '#9a5a00' },
  red: { tube: '#ff5a52', core: '#ffd6cf', glow: '#ff3b33', dim: '#4a2228', box: '#ffdcd6', boxText: '#b3201a' },
  violet: { tube: '#b98cff', core: '#efe4ff', glow: '#a070ff', dim: '#33284f', box: '#ece0ff', boxText: '#5b2db0' },
  mint: { tube: '#5ff2bf', core: '#dcfff2', glow: '#36e6a8', dim: '#1f3d3a', box: '#d8fff0', boxText: '#0b7a55' },
  orange: { tube: '#ff9248', core: '#ffe2c8', glow: '#ff7a2b', dim: '#4a3024', box: '#ffe3cf', boxText: '#b3460a' },
  ice: { tube: '#cfe6ff', core: '#ffffff', glow: '#a8ccff', dim: '#2e3550', box: '#f2f7ff', boxText: '#2f4a7a' },
  plain: { tube: '#f3e3c3', core: '#fffaf0', glow: '#ffe2b0', dim: '#3a3540', box: '#f6ecd8', boxText: '#3b2f2a' },
};

export const SIGN_BOARD = {
  dark: '#160f1e',
  frame: '#0b0910',
  bracket: '#2a2d44',
  paper: '#cfc6b4',
  paperText: '#3a302a',
  cream: '#f4ecdc',
} as const;
