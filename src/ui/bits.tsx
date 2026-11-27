import { useLayoutEffect, useRef } from 'preact/hooks';
import { iconSvg, type IconName } from '../art/icons';
import { bodySvg, portraitSvg, type Look } from '../art/avatar';
import { hasItemArt, itemSvg, spotSvg, type SpotName } from '../art/items';
import { sceneSvg, type Part, type SceneId } from '../art/scenes';

export const Icon = ({ name, size = 22, stroke = 2 }: { name: IconName | string; size?: number; stroke?: number }) => (
  <span class="ico" dangerouslySetInnerHTML={{ __html: iconSvg(name as IconName, size, stroke) }} />
);

export const Portrait = ({ look, title }: { look: Look; title?: string }) => (
  <span style="display:contents" dangerouslySetInnerHTML={{ __html: portraitSvg(look, { title }) }} />
);

export const Body = ({ look, title }: { look: Look; title?: string }) => (
  <span style="display:contents" dangerouslySetInnerHTML={{ __html: bodySvg(look, { title }) }} />
);

export const Cost = ({ energy, coins }: { energy?: number; coins?: number }) => (
  <>
    {energy ? <span class="cost" data-kind="energy"><Icon name="bolt" size={15} />{energy}</span> : null}
    {coins ? <span class="cost" data-kind="coins"><Icon name="coin" size={15} />{coins}</span> : null}
  </>
);

/**
 * A card's scene banner. Inside a sheet it steps aside when the sheet would have to scroll with it,
 * so the choices never go below the fold for the sake of a picture.
 */
export function Scene({ id, part, crush, face }: { id: SceneId; part?: Part; crush?: Look; face?: Look }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const d = el.current, sheet = d?.closest('.sheet');
    if (!d || !sheet) return;
    d.hidden = false;
    if (sheet.scrollHeight > sheet.clientHeight + 1) d.hidden = true;
  });
  return <div ref={el} class="scene" data-scene={id} dangerouslySetInnerHTML={{ __html: sceneSvg(id, { part, crush, face }) }} />;
}

/** A small round face: the speaker chip, the crush next to her messages. */
export const Face = ({ look }: { look: Look }) => (
  <span class="face" dangerouslySetInnerHTML={{ __html: portraitSvg(look) }} />
);

export const ItemArt = ({ id, icon }: { id: string; icon: string }) => (
  hasItemArt(id)
    ? <span class="item-art" dangerouslySetInnerHTML={{ __html: itemSvg(id) }} />
    : <Icon name={icon} />
);

export const Spot = ({ name }: { name: SpotName }) => (
  <span class="spot" dangerouslySetInnerHTML={{ __html: spotSvg(name) }} />
);
