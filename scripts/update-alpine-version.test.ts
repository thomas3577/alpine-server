import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, pickEligibleVersion } from './update-alpine-version.ts';

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    assert.deepEqual(compareVersions('3.15.12', '3.15.12'), 0);
  });

  it('should return a positive number when a is newer than b', () => {
    assert.deepEqual(compareVersions('3.16.1', '3.15.12') > 0, true);
    assert.deepEqual(compareVersions('3.15.12', '3.9.0') > 0, true);
  });

  it('should return a negative number when a is older than b', () => {
    assert.deepEqual(compareVersions('3.15.12', '3.16.1') < 0, true);
    assert.deepEqual(compareVersions('3.9.0', '3.15.12') < 0, true);
  });
});

describe('pickEligibleVersion', () => {
  const now = Date.parse('2026-08-15T00:00:00Z');
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  it('should pick the newest version older than minAgeHours', () => {
    const time = {
      created: hoursAgo(1000),
      modified: hoursAgo(1),
      '3.15.0': hoursAgo(200),
      '3.15.12': hoursAgo(100),
      '3.16.1': hoursAgo(72),
    };
    assert.deepEqual(pickEligibleVersion(time, 48, now), '3.16.1');
  });

  it('should skip versions younger than minAgeHours', () => {
    const time = {
      '3.15.12': hoursAgo(100),
      '3.16.1': hoursAgo(10),
    };
    assert.deepEqual(pickEligibleVersion(time, 48, now), '3.15.12');
  });

  it('should skip prerelease versions', () => {
    const time = {
      '3.15.12': hoursAgo(100),
      '3.16.0-beta.1': hoursAgo(60),
    };
    assert.deepEqual(pickEligibleVersion(time, 48, now), '3.15.12');
  });

  it('should throw when no version satisfies the age threshold', () => {
    const time = {
      '3.16.1': hoursAgo(10),
    };
    assert.throws(() => pickEligibleVersion(time, 48, now), /No version older than 48h found/);
  });
});
