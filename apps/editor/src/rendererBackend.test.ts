import {describe,expect,it} from 'vitest';
import {chooseEditorRendererBackend} from './rendererBackend';

describe('M02 editor renderer selection',()=>{
  it('uses WebGL2 automatically on Android',()=>{
    expect(chooseEditorRendererBackend('', 'Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36')).toBe('webgl2');
  });
  it('keeps automatic WebGPU-first behavior off Android',()=>{
    expect(chooseEditorRendererBackend('', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36')).toBe('auto');
  });
  it('honors explicit QA backend overrides',()=>{
    expect(chooseEditorRendererBackend('?backend=webgpu', 'Mozilla/5.0 (Linux; Android 16; Mobile)')).toBe('webgpu');
    expect(chooseEditorRendererBackend('?backend=webgl2', 'Mozilla/5.0 (X11; Linux x86_64)')).toBe('webgl2');
  });
});
