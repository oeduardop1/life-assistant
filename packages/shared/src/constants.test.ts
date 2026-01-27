import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  WEIGHT_CONFIG,
  TRACKING_VALIDATIONS,
  TRACKING_DEFAULTS,
  RATE_LIMITS,
  STORAGE_LIMITS,
  SYSTEM_DEFAULTS,
  DATA_RETENTION_DAYS,
} from './constants';
import { LifeArea } from './enums';

describe('DEFAULT_WEIGHTS', () => {
  // ADR-017: 6 fixed areas with equal weights (1.0)
  it('should have all 6 life areas', () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).toHaveLength(6);
  });

  it('should have equal weights (1.0) for all life areas', () => {
    expect(DEFAULT_WEIGHTS[LifeArea.HEALTH]).toBe(1.0);
    expect(DEFAULT_WEIGHTS[LifeArea.FINANCE]).toBe(1.0);
    expect(DEFAULT_WEIGHTS[LifeArea.PROFESSIONAL]).toBe(1.0);
    expect(DEFAULT_WEIGHTS[LifeArea.LEARNING]).toBe(1.0);
    expect(DEFAULT_WEIGHTS[LifeArea.SPIRITUAL]).toBe(1.0);
    expect(DEFAULT_WEIGHTS[LifeArea.RELATIONSHIPS]).toBe(1.0);
  });

  it('should have weights between 0 and 2', () => {
    Object.values(DEFAULT_WEIGHTS).forEach((weight) => {
      expect(weight).toBeGreaterThanOrEqual(WEIGHT_CONFIG.MIN);
      expect(weight).toBeLessThanOrEqual(WEIGHT_CONFIG.MAX);
    });
  });
});

describe('WEIGHT_CONFIG', () => {
  it('should have correct min and max values', () => {
    expect(WEIGHT_CONFIG.MIN).toBe(0.0);
    expect(WEIGHT_CONFIG.MAX).toBe(2.0);
  });
});

describe('TRACKING_VALIDATIONS', () => {
  describe('weight', () => {
    it('should have correct limits', () => {
      expect(TRACKING_VALIDATIONS.weight.min).toBe(0);
      expect(TRACKING_VALIDATIONS.weight.max).toBe(500);
      expect(TRACKING_VALIDATIONS.weight.unit).toBe('kg');
    });
  });

  describe('water', () => {
    it('should have correct limits', () => {
      expect(TRACKING_VALIDATIONS.water.min).toBe(0);
      expect(TRACKING_VALIDATIONS.water.max).toBe(10000);
      expect(TRACKING_VALIDATIONS.water.unit).toBe('ml');
    });
  });

  describe('sleep', () => {
    it('should have correct limits', () => {
      expect(TRACKING_VALIDATIONS.sleep.min).toBe(0);
      expect(TRACKING_VALIDATIONS.sleep.max).toBe(24);
      expect(TRACKING_VALIDATIONS.sleep.qualityMin).toBe(1);
      expect(TRACKING_VALIDATIONS.sleep.qualityMax).toBe(10);
    });
  });

  describe('exercise', () => {
    it('should have correct duration limits', () => {
      expect(TRACKING_VALIDATIONS.exercise.minDuration).toBe(0);
      expect(TRACKING_VALIDATIONS.exercise.maxDuration).toBe(1440);
    });
  });

  describe('mood', () => {
    it('should have 1-10 scale', () => {
      expect(TRACKING_VALIDATIONS.mood.min).toBe(1);
      expect(TRACKING_VALIDATIONS.mood.max).toBe(10);
    });
  });

  describe('energy', () => {
    it('should have 1-10 scale', () => {
      expect(TRACKING_VALIDATIONS.energy.min).toBe(1);
      expect(TRACKING_VALIDATIONS.energy.max).toBe(10);
    });
  });
});

describe('TRACKING_DEFAULTS', () => {
  it('should have correct default values', () => {
    expect(TRACKING_DEFAULTS.waterGoal).toBe(2000);
    expect(TRACKING_DEFAULTS.sleepGoal).toBe(8);
    expect(TRACKING_DEFAULTS.exerciseGoalWeekly).toBe(150);
  });
});

describe('RATE_LIMITS', () => {
  describe('free plan', () => {
    it('should have correct rate limits', () => {
      expect(RATE_LIMITS.free.messagesPerMinute).toBe(5);
      expect(RATE_LIMITS.free.messagesPerHour).toBe(30);
      expect(RATE_LIMITS.free.messagesPerDay).toBe(20);
    });
  });

  describe('pro plan', () => {
    it('should have correct rate limits', () => {
      expect(RATE_LIMITS.pro.messagesPerMinute).toBe(10);
      expect(RATE_LIMITS.pro.messagesPerHour).toBe(100);
      expect(RATE_LIMITS.pro.messagesPerDay).toBe(100);
    });
  });

  describe('premium plan', () => {
    it('should have unlimited hour/day limits', () => {
      expect(RATE_LIMITS.premium.messagesPerMinute).toBe(20);
      expect(RATE_LIMITS.premium.messagesPerHour).toBeNull();
      expect(RATE_LIMITS.premium.messagesPerDay).toBeNull();
    });
  });
});

describe('STORAGE_LIMITS', () => {
  describe('free plan', () => {
    it('should have correct storage limits', () => {
      expect(STORAGE_LIMITS.free.messagesPerDay).toBe(20);
      expect(STORAGE_LIMITS.free.trackingEntriesPerMonth).toBe(100);
      expect(STORAGE_LIMITS.free.notes).toBe(50);
      expect(STORAGE_LIMITS.free.people).toBe(20);
      expect(STORAGE_LIMITS.free.storageBytes).toBe(100 * 1024 * 1024); // 100MB
      expect(STORAGE_LIMITS.free.conversationHistoryDays).toBe(30);
    });
  });

  describe('pro plan', () => {
    it('should have correct storage limits', () => {
      expect(STORAGE_LIMITS.pro.messagesPerDay).toBe(100);
      expect(STORAGE_LIMITS.pro.trackingEntriesPerMonth).toBe(1000);
      expect(STORAGE_LIMITS.pro.notes).toBe(500);
      expect(STORAGE_LIMITS.pro.people).toBe(200);
      expect(STORAGE_LIMITS.pro.storageBytes).toBe(1024 * 1024 * 1024); // 1GB
      expect(STORAGE_LIMITS.pro.conversationHistoryDays).toBe(365);
    });
  });

  describe('premium plan', () => {
    it('should have unlimited values', () => {
      expect(STORAGE_LIMITS.premium.messagesPerDay).toBeNull();
      expect(STORAGE_LIMITS.premium.trackingEntriesPerMonth).toBeNull();
      expect(STORAGE_LIMITS.premium.notes).toBeNull();
      expect(STORAGE_LIMITS.premium.people).toBeNull();
      expect(STORAGE_LIMITS.premium.storageBytes).toBe(10 * 1024 * 1024 * 1024); // 10GB
      expect(STORAGE_LIMITS.premium.conversationHistoryDays).toBeNull();
    });
  });
});

describe('SYSTEM_DEFAULTS', () => {
  it('should have pt-BR locale settings', () => {
    expect(SYSTEM_DEFAULTS.timezone).toBe('America/Sao_Paulo');
    expect(SYSTEM_DEFAULTS.locale).toBe('pt-BR');
    expect(SYSTEM_DEFAULTS.currency).toBe('BRL');
  });
});

describe('DATA_RETENTION_DAYS', () => {
  it('should have correct retention periods', () => {
    expect(DATA_RETENTION_DAYS.softDeleteToHardDelete).toBe(30);
    expect(DATA_RETENTION_DAYS.conversation).toBe(90);
  });
});
