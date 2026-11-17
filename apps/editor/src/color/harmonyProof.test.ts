import {describe,it,expect} from 'vitest';
import proofCss from './harmony.css?raw';
import auroraCss from '../ui/aurora.css?raw';

describe('C04-013 display-only proofing',()=>{
  it('covers retained artwork and temporary strokes as well as the base canvas',()=>{
    for(const selector of ['body.c04-gray-proof','body[data-c04-vision="protan"]',
      'body[data-c04-vision="deutan"]','body[data-c04-vision="tritan"]']){
      const start=proofCss.indexOf(selector);
      expect(start).toBeGreaterThanOrEqual(0);
      const brace=proofCss.indexOf('{',start);
      const group=proofCss.slice(start,brace);
      expect(group).toContain('.surface > #canvas');
      expect(group).toContain('.surface > .illustro-document-presentation');
      expect(group).toContain('.surface > .illustro-stroke-overlay');
      expect(group).not.toContain('.topbar');
      expect(group).not.toContain('.color-screen');
    }
  });
});
describe('C04-015 approved Aurora core palette',()=>{
  it('keeps the accepted blue/periwinkle/violet/pink accents',()=>{
    for(const [token,color] of [
      ['--aurora-blue','#5EA8FF'],['--aurora-periwinkle','#708FFF'],
      ['--aurora-violet','#8B7CFF'],['--aurora-pink','#C681DE']
    ] as const)expect(auroraCss).toContain(token+':'+color+';');
    expect(auroraCss).toContain('--a-background:#F7F9FC;');
    expect(auroraCss).toContain('--a-surface:#FFFFFF;');
  });
});
