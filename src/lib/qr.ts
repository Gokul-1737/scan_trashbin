export interface ParsedWasteQrPayload {
  wasteName: string;
  points: number;
  weightKg?: number;
}

const normalizeWasteName = (value: string) => value.trim().replace(/\s+/g, ' ');

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const extractFromRecord = (record: Record<string, unknown>): ParsedWasteQrPayload | null => {
  const wasteNameValue = record.wasteName ?? record.name ?? record.waste ?? record.type;
  const pointsValue = record.points ?? record.pointsEarned ?? record.creditPoints;
  const weightValue = record.weightKg ?? record.weight_kg ?? record.weight;

  if (typeof wasteNameValue !== 'string') {
    return null;
  }

  const points = toNumber(pointsValue);
  if (points === null) {
    return null;
  }

  const weightKg = toNumber(weightValue);

  return {
    wasteName: normalizeWasteName(wasteNameValue),
    points,
    weightKg: weightKg ?? undefined,
  };
};

export const parseWasteQrPayload = (rawValue: string): ParsedWasteQrPayload | null => {
  const raw = rawValue.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const extracted = extractFromRecord(parsed as Record<string, unknown>);
      if (extracted) {
        return extracted;
      }
    }
  } catch {
    // Fall through to the more permissive formats below.
  }

  const queryCandidate = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : raw;
  const queryParams = new URLSearchParams(queryCandidate);

  if (queryParams.has('points') || queryParams.has('waste') || queryParams.has('wasteName')) {
    const extracted = extractFromRecord({
      wasteName: queryParams.get('wasteName') ?? queryParams.get('waste') ?? queryParams.get('name') ?? undefined,
      points: queryParams.get('points') ?? queryParams.get('pointsEarned') ?? queryParams.get('creditPoints') ?? undefined,
      weightKg: queryParams.get('weightKg') ?? queryParams.get('weight_kg') ?? queryParams.get('weight') ?? undefined,
    });

    if (extracted) {
      return extracted;
    }
  }

  for (const separator of ['|', ':', ',']) {
    const parts = raw.split(separator).map((part) => part.trim());
    if (parts.length >= 2) {
      const points = toNumber(parts[parts.length - 1]);
      const wasteName = parts.slice(0, -1).join(separator).trim();

      if (wasteName && points !== null) {
        return {
          wasteName: normalizeWasteName(wasteName),
          points,
        };
      }
    }
  }

  const whitespaceParts = raw.split(/\s+/);
  if (whitespaceParts.length >= 2) {
    const points = toNumber(whitespaceParts[whitespaceParts.length - 1]);
    const wasteName = whitespaceParts.slice(0, -1).join(' ').trim();

    if (wasteName && points !== null) {
      return {
        wasteName: normalizeWasteName(wasteName),
        points,
      };
    }
  }

  return null;
};