import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import type { SceneProps } from './three/Scene';

// WebGL isn't available in jsdom. The stub stands in for the 3D room: it
// reports "loaded" and exposes a button per hotspot, like tapping it in 3D.
let failLoad = false;
vi.mock('./three/Room', () => ({ chooseModelUrl: () => '/models/rehearsal-room.glb' }));
vi.mock('./three/Scene', () => ({
  default: function StubScene(p: SceneProps) {
    useEffect(() => {
      if (failLoad) p.onError(new Error('404'));
      else p.onLoaded();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <div data-testid="scene" data-dark={p.darkness} data-speakers={p.speakersLive}>
        {p.interactive && <button onClick={() => p.onSelect('mitch')}>3d:mitch</button>}
      </div>
    );
  },
}));

const { default: App } = await import('./App');

async function enter(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Enter the room' }));
  // First visit: get past the welcome tour.
  const skip = screen.queryByRole('button', { name: 'Skip' });
  if (skip) await user.click(skip);
}

async function openObject(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Object list' }));
  await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
}

describe('App', () => {
  beforeEach(() => {
    failLoad = false;
  });

  it('shows an error with a retry when the room fails to load', async () => {
    failLoad = true;
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent("didn't load");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('walks a first-time visitor through the welcome tour, once', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Enter the room' }));
    const tour = screen.getByRole('dialog', { name: 'Welcome to the room' });
    expect(within(tour).getByText(/Mitch on guitar, Jewel on vocals and Zac on drums/)).toBeInTheDocument();
    // The room can't be used until the tour is done.
    expect(screen.queryByRole('button', { name: '3d:mitch' })).not.toBeInTheDocument();
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: "Can't find something?" })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.queryByRole('dialog', { name: "Can't find something?" })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3d:mitch' })).toBeInTheDocument();
    unmount();

    // Coming back: no tour, a welcome-back pop-up instead.
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Enter the room' }));
    expect(screen.queryByRole('dialog', { name: 'Welcome to the room' })).not.toBeInTheDocument();
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();

    // And it can be replayed from Settings.
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Replay the welcome tour' }));
    expect(screen.getByRole('dialog', { name: 'Welcome to the room' })).toBeInTheDocument();
  });

  it('pops up progress as tasks and secrets are found', async () => {
    const user = userEvent.setup();
    await enter(user);
    await openObject(user, 'Guitar pedals');
    for (const name of [/Tuner pedal/, /Drive pedal/, /Echo pedal/]) await user.click(screen.getByRole('button', { name }));
    expect(await screen.findByText(/that's one sorted\. Next up: Somewhere in the pizza boxes/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to the room' }));
    await openObject(user, 'Red stool');
    expect(await screen.findByText(/You found a secret! 16 more/, {}, { timeout: 6000 })).toBeInTheDocument();
  }, 10000);

  it('opens a fact card from the room and backs out with Escape', async () => {
    const user = userEvent.setup();
    await enter(user);
    await user.click(screen.getByRole('button', { name: '3d:mitch' }));
    const card = screen.getByRole('dialog', { name: 'Mitch' });
    expect(within(card).getByText(/Something's wrong with my pedals/)).toBeInTheDocument();
    expect(within(card).getByText(/butterscotch Telecaster/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Mitch' })).not.toBeInTheDocument();
  });

  it('records a secret once, from the object list', async () => {
    const user = userEvent.setup();
    await enter(user);
    await openObject(user, 'Red stool');
    expect(screen.getByRole('dialog', { name: 'The red stool' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close The red stool/ }));
    await openObject(user, 'Red stool');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /Discoveries · 1/ })).toBeInTheDocument();
  });

  it('gates the final reveal behind all three tasks and saves progress', async () => {
    const user = userEvent.setup();
    await enter(user);
    expect(screen.queryByRole('button', { name: 'Start rehearsal' })).not.toBeInTheDocument();

    await openObject(user, 'Guitar pedals');
    for (const name of [/Tuner pedal/, /Drive pedal/, /Echo pedal/]) await user.click(screen.getByRole('button', { name }));
    await user.click(screen.getByRole('button', { name: 'Back to the room' }));
    expect(screen.getByRole('button', { name: /Tasks 1\/3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start rehearsal' })).not.toBeInTheDocument();

    await openObject(user, 'Pizza boxes');
    await user.click(screen.getByRole('button', { name: /Box 3/ }));
    await user.click(screen.getByRole('button', { name: /Move the last slice/ }));
    await user.click(screen.getByRole('button', { name: 'Take the paper' }));
    await user.click(screen.getByRole('button', { name: 'Back to the room' }));
    expect(screen.queryByRole('button', { name: 'Start rehearsal' })).not.toBeInTheDocument();

    // Mark the beat done the way a returning player would have it: from saved progress.
    const saved = JSON.parse(localStorage.getItem('the-last-rehearsal:v1')!);
    expect(saved.tasks).toEqual({ sound: true, setlist: true, beat: false });
    expect(saved.discoveries).toEqual(['setlist']);
  });

  it('runs the reveal when everything is done', async () => {
    localStorage.setItem('the-last-rehearsal:v1', JSON.stringify({ tasks: { sound: true, setlist: true, beat: true } }));
    const user = userEvent.setup();
    await enter(user);
    await user.click(screen.getByRole('button', { name: 'Start rehearsal' }));
    await waitFor(() => expect(screen.getByTestId('scene')).toHaveAttribute('data-dark', '1'), { timeout: 3000 });
    expect(screen.getByTestId('scene')).toHaveAttribute('data-speakers', 'true');
    expect(await screen.findByText(/Alright\. Let's do this\./, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Rehearsal complete/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('the-last-rehearsal:v1')!).revealSeen).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Reset and play again' }));
    expect(screen.getByRole('button', { name: /Tasks 0\/3/ })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('the-last-rehearsal:v1')!).tasks.sound).toBe(false);
  }, 15000);
});
