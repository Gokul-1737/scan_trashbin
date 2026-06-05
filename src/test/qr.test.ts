import { describe, expect, it } from 'vitest';
import { parseWasteQrPayload } from '@/lib/qr';

describe('parseWasteQrPayload', () => {
  it('parses JSON payloads', () => {
    expect(parseWasteQrPayload('{"wasteName":"Plastic","points":25,"weightKg":1.5}')).toEqual({
      wasteName: 'Plastic',
      points: 25,
      weightKg: 1.5,
    });
  });

  it('parses query style payloads', () => {
    expect(parseWasteQrPayload('waste=Glass&points=14')).toEqual({
      wasteName: 'Glass',
      points: 14,
    });
  });

  it('parses compact payloads', () => {
    expect(parseWasteQrPayload('Organic Waste|8')).toEqual({
      wasteName: 'Organic Waste',
      points: 8,
    });
  });

  it('returns null for invalid payloads', () => {
    expect(parseWasteQrPayload('unknown')).toBeNull();
  });
});