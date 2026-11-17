import type {BoardItem} from './referenceBoardStore';
import type {AssetEntry} from './library';

/** Change only the reference window whose display inputs actually changed. */
export function referenceFrameKey(
  item:BoardItem,
  asset:Pick<AssetEntry,'id'|'updatedAt'|'name'|'mime'|'bytes'>|null
):string{
  return JSON.stringify([item,asset?[
    asset.id,asset.updatedAt,asset.name,asset.mime,asset.bytes
  ]:null]);
}
