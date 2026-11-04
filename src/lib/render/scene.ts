import { createRng } from '../city/seed';
import type { CityLayout } from '../city/types';
import type { CanvasFactory, Glow, Sprite, View } from './canvas';
import type { GlyphAtlas } from './glyphs';
import { glowOffset } from './glow';
import { buildSky, drawSky, moonPosition, type SkyArt } from './layers/sky';
import { buildMidground, buildSkyline } from './layers/skyline';
import { drawStrip, type Strip } from './layers/strip';
import { buildStreet, drawStreet, type LightPool, type StreetArt } from './layers/street';
import { drawBuilding } from './sprites/building';
import { drawFixture } from './sprites/fixtures';
import { drawIzakaya } from './sprites/izakaya';
import { drawProp, drawWires } from './sprites/props';
import { drawSign } from './sprites/sign';

/**
 * A city ready to draw: every static piece is baked once into cached
 * sprites, so drawing a frame is just a series of blits.
 *
 * Layers, back to front: sky (moon, stars, clouds), distant skyline,
 * midground with the railway, street, buildings, signs, street furniture,
 * wires, then glows added on top after upscaling.
 */
export interface Scene {
  layout: CityLayout;
  sky: SkyArt;
  skyline: Strip;
  midground: Strip;
  street: StreetArt;
  buildings: Sprite[];
  signs: Sprite[];
  props: Sprite[];
  poles: Sprite[];
  wires: Sprite | null;
  glows: Glow[];
}

export interface SceneDeps {
  atlas: GlyphAtlas;
  createCanvas: CanvasFactory;
}

export function buildScene(layout: CityLayout, { atlas, createCanvas }: SceneDeps): Scene {
  const rng = createRng(layout.seed).fork('scene');
  const buildings: Sprite[] = [];
  const signs: Sprite[] = [];
  const props: Sprite[] = [];
  const poles: Sprite[] = [];
  const glows: Glow[] = [];
  const pools: LightPool[] = [];

  for (const fixture of layout.fixtures) {
    const art = drawFixture(fixture, atlas, createCanvas);
    buildings.push(art.sprite);
    glows.push(...art.glows);
    pools.push(...art.pools);
  }
  for (const building of layout.buildings) {
    const art = building.kind === 'izakaya' ? drawIzakaya(building, createCanvas) : drawBuilding(building, createCanvas);
    buildings.push(art.sprite);
    glows.push(...art.glows);
    pools.push(...art.pools);
    const sign = drawSign(building, atlas, createCanvas);
    signs.push(sign.sprite);
    glows.push(...sign.glows);
  }
  for (const prop of layout.props) {
    const art = drawProp(prop, createCanvas);
    (prop.kind === 'pole' || prop.kind === 'trafficLight' ? poles : props).push(art.sprite);
    glows.push(...art.glows);
    pools.push(...art.pools);
  }

  return {
    layout,
    sky: buildSky(rng.fork('sky'), createCanvas),
    skyline: buildSkyline(rng.fork('skyline'), createCanvas),
    midground: buildMidground(rng.fork('midground'), createCanvas),
    street: buildStreet(layout, pools, createCanvas),
    buildings,
    signs,
    props,
    poles,
    wires: drawWires(
      layout.props.filter((prop) => prop.kind === 'pole'),
      layout.width,
      createCanvas,
    ),
    glows,
  };
}

/** Draw the pixel layers of `view` into a canvas at 1 art pixel per canvas pixel. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, view: View, time = 0): void {
  ctx.imageSmoothingEnabled = false;
  drawSky(ctx, scene.sky, view, time);
  drawStrip(ctx, scene.skyline, view);
  drawStrip(ctx, scene.midground, view);
  drawSprites(ctx, scene.street.sideStreets, view);
  drawStreet(ctx, scene.street, view);
  drawSprites(ctx, scene.buildings, view);
  // Wires pass behind the signs so they never cut through lettering.
  if (scene.wires) drawSprites(ctx, [scene.wires], view);
  drawSprites(ctx, scene.signs, view);
  drawSprites(ctx, scene.props, view);
  drawSprites(ctx, scene.poles, view);
}

/**
 * Add the soft glows onto an already upscaled frame. Glow sprites are
 * low-resolution blurs, drawn with smoothing on so they stay soft.
 */
export function drawGlows(ctx: CanvasRenderingContext2D, scene: Scene, view: View, scale: number, strength = 1): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = 'lighter';

  const moon = moonPosition(view);
  const moonPad = glowOffset(6);
  ctx.globalAlpha = 0.35 * strength;
  ctx.drawImage(
    scene.sky.moonGlow,
    (moon.x - moonPad) * scale,
    (moon.y - moonPad) * scale,
    scene.sky.moonGlow.width * scale,
    scene.sky.moonGlow.height * scale,
  );

  for (const glow of scene.glows) {
    if (!intersects(glow, view)) continue;
    ctx.globalAlpha = Math.min(1, glow.alpha * strength);
    ctx.drawImage(glow.canvas, (glow.x - view.x) * scale, (glow.y - view.y) * scale, glow.canvas.width * scale, glow.canvas.height * scale);
  }
  ctx.restore();
}

function drawSprites(ctx: CanvasRenderingContext2D, sprites: Sprite[], view: View): void {
  for (const sprite of sprites) {
    if (intersects(sprite, view)) ctx.drawImage(sprite.canvas, Math.round(sprite.x - view.x), Math.round(sprite.y - view.y));
  }
}

function intersects(sprite: Sprite, view: View): boolean {
  return (
    sprite.x < view.x + view.w &&
    sprite.x + sprite.canvas.width > view.x &&
    sprite.y < view.y + view.h &&
    sprite.y + sprite.canvas.height > view.y
  );
}
