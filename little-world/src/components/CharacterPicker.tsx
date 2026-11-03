import { CHARACTERS, CharacterDefinition, MAX_CHARACTERS, MAX_SCALE, MIN_SCALE } from '../data/characters';
import type { AssetState } from '../hooks/useCharacterAssets';
import { CharacterPlacement, clampX } from '../lib/placement';
import { ORIGINAL_ART } from './OriginalCharacters';

function Thumb({ def, asset }: { def: CharacterDefinition; asset: AssetState }) {
  const Art = ORIGINAL_ART[def.id];
  if (Art) {
    return (
      <svg viewBox="0 0 200 260" className="lw-thumb-img" aria-hidden>
        <Art />
      </svg>
    );
  }
  if (asset !== 'loading' && asset !== 'missing') return <img src={asset.src} alt="" className="lw-thumb-img" draggable={false} />;
  return (
    <div className="lw-thumb-missing" aria-hidden>
      ?
    </div>
  );
}

type Props = {
  placements: CharacterPlacement[];
  assets: Record<string, AssetState>;
  selectedUid: string | null;
  onAdd: (id: string) => void;
  onRemove: (uid: string) => void;
  onUpdate: (uid: string, patch: Partial<CharacterPlacement>) => void;
  onSelect: (uid: string | null) => void;
  onDone: () => void;
};

export function CharacterPicker({ placements, assets, selectedUid, onAdd, onRemove, onUpdate, onSelect, onDone }: Props) {
  const full = placements.length >= MAX_CHARACTERS;
  const selected = placements.find((p) => p.uid === selectedUid) ?? null;
  const selectedDef = selected ? CHARACTERS.find((c) => c.id === selected.characterId) : null;

  return (
    <section className="lw-picker lw-card" aria-label="Edit world">
      <header className="lw-picker-head">
        <h2 className="lw-title">Edit world</h2>
        <span className="lw-count">
          {placements.length}/{MAX_CHARACTERS} in your world
        </span>
        <button className="lw-btn lw-btn-primary" onClick={onDone}>
          Done
        </button>
      </header>

      <div className="lw-tray" role="list">
        {CHARACTERS.map((c) => {
          const a = assets[c.id];
          const missing = a === 'missing';
          const loading = a === 'loading';
          const disabled = full || missing || loading;
          return (
            <button
              key={c.id}
              role="listitem"
              className={`lw-thumb${missing ? ' is-missing' : ''}`}
              disabled={disabled}
              onClick={() => onAdd(c.id)}
              title={missing ? `Add artwork at public/characters/${c.id}.png to unlock` : full ? 'Your world is full (5 characters)' : `Add ${c.name}`}
              aria-label={missing ? `${c.name}: artwork not supplied yet` : `Add ${c.name}`}
            >
              <Thumb def={c} asset={a} />
              <span className="lw-thumb-name">{c.name}</span>
              <span className="lw-thumb-vibe">{missing ? 'Artwork needed' : c.vibe}</span>
            </button>
          );
        })}
      </div>

      <div className="lw-picker-foot">
        {selected && selectedDef ? (
          <div className="lw-selected" aria-label={`${selectedDef.name} controls`}>
            <strong>{selectedDef.name}</strong>
            <button className="lw-btn lw-btn-small" onClick={() => onUpdate(selected.uid, { x: clampX(selected.x - 0.03) })} aria-label="Move left">
              ◀
            </button>
            <button className="lw-btn lw-btn-small" onClick={() => onUpdate(selected.uid, { x: clampX(selected.x + 0.03) })} aria-label="Move right">
              ▶
            </button>
            <label className="lw-slider">
              Size
              <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.05}
                value={selected.scale}
                onChange={(e) => onUpdate(selected.uid, { scale: Number(e.target.value) })}
              />
            </label>
            <button className="lw-btn lw-btn-danger lw-btn-small" onClick={() => onRemove(selected.uid)}>
              Remove
            </button>
            <button className="lw-btn lw-btn-ghost lw-btn-small" onClick={() => onSelect(null)}>
              Deselect
            </button>
          </div>
        ) : (
          <p className="lw-hint">Tap a character to add it. Drag characters along the grass to move them; select one to resize or remove it.</p>
        )}
      </div>
    </section>
  );
}
