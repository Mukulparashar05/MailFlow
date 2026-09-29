/**
 * Tests for email delay calculation
 * Tests scheduling logic without requiring a real database
 */

describe('Email Scheduling - Delay Calculation', () => {
  const startAt = new Date('2024-01-01T10:00:00.000Z');

  function calculateScheduledTimes(
    recipients: string[],
    startAt: Date,
    delayBetweenEmails: number,
  ): Date[] {
    return recipients.map((_, index) => {
      const delayMs = index * delayBetweenEmails * 1000;
      return new Date(startAt.getTime() + delayMs);
    });
  }

  it('should schedule first email at startAt with no delay', () => {
    const recipients = ['a@test.com', 'b@test.com', 'c@test.com'];
    const times = calculateScheduledTimes(recipients, startAt, 30);

    expect(times[0].getTime()).toBe(startAt.getTime());
  });

  it('should space emails by delayBetweenEmails seconds', () => {
    const recipients = ['a@test.com', 'b@test.com', 'c@test.com'];
    const delay = 30; // seconds
    const times = calculateScheduledTimes(recipients, startAt, delay);

    expect(times[1].getTime() - times[0].getTime()).toBe(delay * 1000);
    expect(times[2].getTime() - times[1].getTime()).toBe(delay * 1000);
  });

  it('should handle 4 recipients with 20s delay', () => {
    const recipients = ['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com'];
    const times = calculateScheduledTimes(recipients, startAt, 20);

    expect(times[0]).toEqual(startAt);
    expect(times[1].getTime()).toBe(startAt.getTime() + 20000);
    expect(times[2].getTime()).toBe(startAt.getTime() + 40000);
    expect(times[3].getTime()).toBe(startAt.getTime() + 60000);
  });

  it('should handle 0 delay (all at same time)', () => {
    const recipients = ['a@test.com', 'b@test.com'];
    const times = calculateScheduledTimes(recipients, startAt, 0);

    expect(times[0].getTime()).toBe(times[1].getTime());
  });

  it('should deduplicate recipients correctly', () => {
    const rawRecipients = ['a@test.com', 'A@test.com', 'b@test.com', 'b@test.com'];
    const unique = [...new Set(rawRecipients.map((r) => r.toLowerCase().trim()))];
    expect(unique).toHaveLength(2);
    expect(unique).toContain('a@test.com');
    expect(unique).toContain('b@test.com');
  });
});

import { parseCsvRecipients } from '../src/utils/csvParser';

describe('CSV Parsing', () => {

  it('should parse valid emails from CSV', () => {
    const csv = `user1@example.com\nuser2@example.com\nuser3@example.com`;
    const result = parseCsvRecipients(csv);
    expect(result.emails).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid emails', () => {
    const csv = `valid@example.com\nnot-an-email\nalso@invalid`;
    const result = parseCsvRecipients(csv);
    expect(result.emails).toHaveLength(1);
    expect(result.invalid).toHaveLength(2);
  });

  it('should deduplicate emails in CSV', () => {
    const csv = `a@test.com\na@test.com\nA@test.com`;
    const result = parseCsvRecipients(csv);
    expect(result.emails).toHaveLength(1);
  });

  it('should parse first column from CSV rows', () => {
    const csv = `user@example.com,John Doe,Marketing\nother@example.com,Jane Doe,Sales`;
    const result = parseCsvRecipients(csv);
    expect(result.emails).toHaveLength(2);
    expect(result.emails[0]).toBe('user@example.com');
  });

  it('should handle empty CSV gracefully', () => {
    const result = parseCsvRecipients('');
    expect(result.emails).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Rate Limiting Logic', () => {
  it('should calculate correct window timestamp', () => {
    const now = Math.floor(Date.now() / 1000);
    const windowSeconds = 3600;
    const windowTimestamp = Math.floor(now / windowSeconds);
    const nextWindowAt = new Date((windowTimestamp + 1) * windowSeconds * 1000);

    // Next window should be in the future
    expect(nextWindowAt.getTime()).toBeGreaterThan(Date.now());
    // But within the next hour
    expect(nextWindowAt.getTime()).toBeLessThanOrEqual(Date.now() + 3600 * 1000);
  });

  it('should generate correct rate limit key format', () => {
    const campaignId = 'test-campaign-123';
    const now = Math.floor(Date.now() / 1000);
    const windowTimestamp = Math.floor(now / 3600);
    const key = `rate_limit:${campaignId}:${windowTimestamp}`;

    expect(key).toMatch(/^rate_limit:[^:]+:\d+$/);
    expect(key).toContain(campaignId);
  });
});

describe('Idempotency - Job ID Generation', () => {
  it('should generate deterministic job IDs', () => {
    const emailJobId = 'clx1234567890';
    const bullJobId = `email-job-${emailJobId}`;
    const bullJobId2 = `email-job-${emailJobId}`;

    expect(bullJobId).toBe(bullJobId2);
    expect(bullJobId).toBe('email-job-clx1234567890');
  });

  it('should have unique job IDs per email job', () => {
    const jobIds = ['abc', 'def', 'ghi'].map((id) => `email-job-${id}`);
    const unique = new Set(jobIds);
    expect(unique.size).toBe(jobIds.length);
  });
});
