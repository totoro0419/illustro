import {describe,it,expect} from 'vitest';
import {historyPreviewDimensions} from './artworkHistoryView';

describe('C03-007/012 history image size constraints',()=>{
  it('bounds 4000px preview without cropping the image',()=>{
    expect(historyPreviewDimensions(4000,4000,1600,1200)).toEqual({width:1200,height:1200});
    expect(historyPreviewDimensions(4000,2000,1600,1200)).toEqual({width:1600,height:800});
    expect(historyPreviewDimensions(2000,4000,1600,1200)).toEqual({width:600,height:1200});
  });
  it('does not enlarge small images or accept invalid dimensions',()=>{
    expect(historyPreviewDimensions(64,32,1600,1200)).toEqual({width:64,height:32});
    expect(()=>historyPreviewDimensions(0,4000,1600,1200)).toThrow();
    expect(()=>historyPreviewDimensions(4000,4000,0,1200)).toThrow();
  });
});
