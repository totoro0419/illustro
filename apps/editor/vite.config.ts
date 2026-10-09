import {defineConfig,type Plugin} from 'vite';

function m05OfflineAssetManifest():Plugin{
  return {
    name:'m05-offline-asset-manifest',
    generateBundle(_options,bundle){
      const assets=Object.keys(bundle).filter(name=>!name.endsWith('.map')).sort();
      this.emitFile({type:'asset',fileName:'offline-assets.json',source:JSON.stringify({version:1,assets})});
    },
  };
}

export default defineConfig({plugins:[m05OfflineAssetManifest()]});
