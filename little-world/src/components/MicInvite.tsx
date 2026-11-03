export function MicInvite({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <div className="lw-invite lw-card" role="dialog" aria-labelledby="lw-invite-title">
      <p id="lw-invite-title" className="lw-pixel">LET YOUR LITTLE WORLD LISTEN.</p>
      <p className="lw-invite-note">Music and voices make the meadow dance. Sound is measured on this device only; nothing is recorded or sent.</p>
      <div className="lw-row">
        <button className="lw-btn lw-btn-primary" onClick={onEnable}>
          ENABLE MICROPHONE
        </button>
        <button className="lw-btn lw-btn-ghost" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
