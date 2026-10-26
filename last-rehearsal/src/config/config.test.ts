import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { FACTS, MESSAGES, SECRETS, SETLIST, STORY } from './content';
import { CAMERA_BOUNDS, HOME_VIEW, HOTSPOTS, ORBIT_LIMITS, hotspotForPuzzle } from './hotspots';

const inside = (p: number[]) => p.every((v, i) => v >= CAMERA_BOUNDS.min[i] && v <= CAMERA_BOUNDS.max[i]);

describe('hotspot config', () => {
  it('has unique ids', () => {
    const ids = HOTSPOTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every hotspot at copy that exists', () => {
    for (const h of HOTSPOTS) {
      const a = h.action;
      if (a.type === 'fact') expect(FACTS[a.factId], h.id).toBeDefined();
      if (a.type === 'secret') expect(SECRETS[a.secretId], h.id).toBeDefined();
      if (a.type === 'message') expect(MESSAGES[a.messageId], h.id).toBeDefined();
    }
  });

  it('covers every object the brief asks for', () => {
    const ids = HOTSPOTS.map((h) => h.id);
    for (const id of ['mitch', 'jewel', 'drummer', 'pedals', 'pizza', 'drums', 'mural', 'mural-eyes', 'stool', 'guitar', 'mic']) {
      expect(ids).toContain(id);
    }
    expect(['pedals', 'setlist', 'beat'].map((p) => hotspotForPuzzle(p as 'pedals').id)).toEqual(['pedals', 'pizza', 'drums']);
  });

  it('never flies the camera outside the room', () => {
    expect(inside(HOME_VIEW.position)).toBe(true);
    for (const h of HOTSPOTS) expect(inside(h.focus.position), h.id).toBe(true);
  });

  it('starts the camera within the orbit limits', () => {
    const [px, py, pz] = HOME_VIEW.position;
    const [tx, ty, tz] = HOME_VIEW.target;
    const d = Math.hypot(px - tx, py - ty, pz - tz);
    const polar = Math.acos((py - ty) / d);
    expect(d).toBeLessThanOrEqual(ORBIT_LIMITS.maxDistance);
    expect(d).toBeGreaterThanOrEqual(ORBIT_LIMITS.minDistance);
    expect(polar).toBeGreaterThanOrEqual(ORBIT_LIMITS.minPolar);
    expect(polar).toBeLessThanOrEqual(ORBIT_LIMITS.maxPolar);
  });

  it('ships finished copy, with no placeholder text left in', () => {
    const all = JSON.stringify({ FACTS, SECRETS, MESSAGES, SETLIST, STORY });
    expect(all).not.toMatch(/placeholder|to be confirmed|\bTBC\b|lorem|goes here/i);
  });

  it('has a secret behind every secret hotspot, and no orphan secrets', () => {
    const used = HOTSPOTS.flatMap((h) => (h.action.type === 'secret' ? [h.action.secretId] : []));
    expect(new Set(used)).toEqual(new Set(Object.keys(SECRETS)));
  });

  it("doesn't name the drummer", () => {
    expect(FACTS.drummer.name).toBe('The drummer');
  });
});

describe('room scan assets', () => {
  const glb = (name: string) => readFileSync(resolve(__dirname, '../../public/models', name));

  for (const name of ['rehearsal-room.glb', 'rehearsal-room.web.glb', 'rehearsal-room.mobile.glb']) {
    it(`${name} is a valid glTF binary with the two scan meshes`, () => {
      const buf = glb(name);
      expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
      expect(buf.readUInt32LE(4)).toBe(2);
      expect(buf.readUInt32LE(8)).toBe(buf.length);
      const jsonLength = buf.readUInt32LE(12);
      const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
      expect(json.meshes).toHaveLength(2);
      expect(json.images).toHaveLength(2);
    });
  }

  it('keeps the web copies small', () => {
    const size = (name: string) => statSync(resolve(__dirname, '../../public/models', name)).size;
    expect(size('rehearsal-room.web.glb')).toBeLessThan(3 * 1024 * 1024);
    expect(size('rehearsal-room.mobile.glb')).toBeLessThan(1.5 * 1024 * 1024);
  });
});
