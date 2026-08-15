import { assertEquals, assertThrows } from '@std/assert';
import { compareVersions, pickEligibleVersion } from './update-alpine-version.ts';

Deno.test('compareVersions', async (t) => {
  await t.step('should return 0 for equal versions', () => {
    assertEquals(compareVersions('3.15.12', '3.15.12'), 0);
  });

  await t.step('should return a positive number when a is newer than b', () => {
    assertEquals(compareVersions('3.16.1', '3.15.12') > 0, true);
    assertEquals(compareVersions('3.15.12', '3.9.0') > 0, true);
  });

  await t.step('should return a negative number when a is older than b', () => {
    assertEquals(compareVersions('3.15.12', '3.16.1') < 0, true);
    assertEquals(compareVersions('3.9.0', '3.15.12') < 0, true);
  });
});

Deno.test('pickEligibleVersion', async (t) => {
  const now = Date.parse('2026-08-15T00:00:00Z');
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  await t.step('should pick the newest version older than minAgeHours', () => {
    const time = {
      created: hoursAgo(1000),
      modified: hoursAgo(1),
      '3.15.0': hoursAgo(200),
      '3.15.12': hoursAgo(100),
      '3.16.1': hoursAgo(72),
    };
    assertEquals(pickEligibleVersion(time, 48, now), '3.16.1');
  });

  await t.step('should skip versions younger than minAgeHours', () => {
    const time = {
      '3.15.12': hoursAgo(100),
      '3.16.1': hoursAgo(10),
    };
    assertEquals(pickEligibleVersion(time, 48, now), '3.15.12');
  });

  await t.step('should skip prerelease versions', () => {
    const time = {
      '3.15.12': hoursAgo(100),
      '3.16.0-beta.1': hoursAgo(60),
    };
    assertEquals(pickEligibleVersion(time, 48, now), '3.15.12');
  });

  await t.step('should throw when no version satisfies the age threshold', () => {
    const time = {
      '3.16.1': hoursAgo(10),
    };
    assertThrows(() => pickEligibleVersion(time, 48, now), Error, 'No version older than 48h found');
  });
});
