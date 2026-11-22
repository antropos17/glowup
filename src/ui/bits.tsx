import { iconSvg, type IconName } from '../art/icons';
import { bodySvg, portraitSvg, type Look } from '../art/avatar';

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
