import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BEAT, BEAT_STEP_MS } from '../config/game';
import { BeatPuzzle } from './BeatPuzzle';
import { PedalPuzzle } from './PedalPuzzle';
import { SetlistPuzzle } from './SetlistPuzzle';

describe('PedalPuzzle', () => {
  it('resets on the wrong order and solves in the right one, from the keyboard', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<PedalPuzzle solved={false} onSolved={onSolved} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /read it/i }));
    expect(screen.getByText(/Grass, then fire, then the sea/)).toBeInTheDocument();

    screen.getByRole('button', { name: /Drive pedal/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(/Wrong order/);
    expect(onSolved).not.toHaveBeenCalled();

    for (const name of [/Tuner pedal/, /Drive pedal/, /Echo pedal/]) {
      screen.getByRole('button', { name }).focus();
      await user.keyboard(' ');
    }
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/Amp's on/);
  });

  it('shows the solved board when already done', () => {
    render(<PedalPuzzle solved onSolved={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /Echo pedal.*on/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('SetlistPuzzle', () => {
  it('finds the setlist under the last slice', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    render(<SetlistPuzzle solved={false} onSolved={onSolved} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Box 1/ }));
    await user.click(screen.getByRole('button', { name: /Move the crusts/ }));
    expect(screen.getByText('Empty.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Box 3/ }));
    expect(screen.queryByRole('button', { name: 'Take the paper' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Move the last slice/ }));
    await user.click(screen.getByRole('button', { name: 'Take the paper' }));
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('The setlist')).toBeInTheDocument();
  });
});

describe('BeatPuzzle', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const keyFor = { kick: '1', snare: '2', cymbal: '3' } as const;

  it('plays the beat, rejects a wrong answer and accepts the right one', async () => {
    const onSolved = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<BeatPuzzle solved={false} onSolved={onSolved} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Play the beat' }));
    expect(screen.getByRole('button', { name: /Kick/ })).toBeDisabled();
    act(() => vi.advanceTimersByTime(BEAT.length * BEAT_STEP_MS + 50));
    expect(screen.getByRole('button', { name: /Kick/ })).toBeEnabled();

    await user.keyboard('3');
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/not it/);

    await user.click(screen.getByRole('button', { name: 'Play it again' }));
    act(() => vi.advanceTimersByTime(BEAT.length * BEAT_STEP_MS + 50));
    for (const d of BEAT) await user.keyboard(keyFor[d]);
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/That's the beat/);
  });
});
