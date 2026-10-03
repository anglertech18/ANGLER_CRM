import { calculateRenewalPeriod } from '../utils/orderFormPdfGenerator';

describe('calculateRenewalPeriod', () => {
  it('uses the current expiry as From and adds a month-based service period', () => {
    expect(calculateRenewalPeriod('2026-10-28', '2025-10-28', 3, 'months').label)
      .toBe('28-Oct-2026 to 28-Jan-2027');
  });

  it('adds yearly service periods from the current expiry', () => {
    expect(calculateRenewalPeriod('2026-10-28', null, 1, 'year').label)
      .toBe('28-Oct-2026 to 28-Oct-2027');
  });

  it('falls back to activation only when expiry is unavailable', () => {
    expect(calculateRenewalPeriod(null, '2026-01-15', 12, 'months').label)
      .toBe('15-Jan-2026 to 15-Jan-2027');
  });
});
