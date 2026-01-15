import { describe, it, expect } from 'vitest';
import {
  UserStatus,
  LifeArea,
  TrackingType,
  ConversationType,
  VaultItemType,
  VaultCategory,
  ExpenseCategory,
  ALL_USER_STATUSES,
  ALL_LIFE_AREAS,
  ALL_TRACKING_TYPES,
  ALL_CONVERSATION_TYPES,
  ALL_VAULT_ITEM_TYPES,
  ALL_VAULT_CATEGORIES,
  ALL_EXPENSE_CATEGORIES,
} from './enums';

describe('UserStatus', () => {
  it('should have 5 values', () => {
    expect(Object.values(UserStatus)).toHaveLength(5);
  });

  it('should have correct values', () => {
    expect(UserStatus.PENDING).toBe('pending');
    expect(UserStatus.ACTIVE).toBe('active');
    expect(UserStatus.SUSPENDED).toBe('suspended');
    expect(UserStatus.CANCELED).toBe('canceled');
    expect(UserStatus.DELETED).toBe('deleted');
  });
});

describe('LifeArea', () => {
  it('should have 8 values', () => {
    expect(Object.values(LifeArea)).toHaveLength(8);
  });

  it('should have correct values', () => {
    expect(LifeArea.HEALTH).toBe('health');
    expect(LifeArea.FINANCIAL).toBe('financial');
    expect(LifeArea.CAREER).toBe('career');
    expect(LifeArea.RELATIONSHIPS).toBe('relationships');
    expect(LifeArea.SPIRITUALITY).toBe('spirituality');
    expect(LifeArea.PERSONAL_GROWTH).toBe('personal_growth');
    expect(LifeArea.MENTAL_HEALTH).toBe('mental_health');
    expect(LifeArea.LEISURE).toBe('leisure');
  });
});

describe('TrackingType', () => {
  it('should have 13 values', () => {
    expect(Object.values(TrackingType)).toHaveLength(13);
  });

  it('should have correct values', () => {
    expect(TrackingType.WEIGHT).toBe('weight');
    expect(TrackingType.WATER).toBe('water');
    expect(TrackingType.SLEEP).toBe('sleep');
    expect(TrackingType.EXERCISE).toBe('exercise');
    expect(TrackingType.MEAL).toBe('meal');
    expect(TrackingType.MEDICATION).toBe('medication');
    expect(TrackingType.EXPENSE).toBe('expense');
    expect(TrackingType.INCOME).toBe('income');
    expect(TrackingType.INVESTMENT).toBe('investment');
    expect(TrackingType.HABIT).toBe('habit');
    expect(TrackingType.MOOD).toBe('mood');
    expect(TrackingType.ENERGY).toBe('energy');
    expect(TrackingType.CUSTOM).toBe('custom');
  });
});

describe('ConversationType', () => {
  it('should have 4 values', () => {
    expect(Object.values(ConversationType)).toHaveLength(4);
  });

  it('should have correct values', () => {
    expect(ConversationType.GENERAL).toBe('general');
    expect(ConversationType.COUNSELOR).toBe('counselor');
    expect(ConversationType.QUICK_ACTION).toBe('quick_action');
    expect(ConversationType.REPORT).toBe('report');
  });
});

describe('VaultItemType', () => {
  it('should have 5 values', () => {
    expect(Object.values(VaultItemType)).toHaveLength(5);
  });

  it('should have correct values', () => {
    expect(VaultItemType.CREDENTIAL).toBe('credential');
    expect(VaultItemType.DOCUMENT).toBe('document');
    expect(VaultItemType.CARD).toBe('card');
    expect(VaultItemType.NOTE).toBe('note');
    expect(VaultItemType.FILE).toBe('file');
  });
});

describe('VaultCategory', () => {
  it('should have 6 values', () => {
    expect(Object.values(VaultCategory)).toHaveLength(6);
  });

  it('should have correct values', () => {
    expect(VaultCategory.PERSONAL).toBe('personal');
    expect(VaultCategory.FINANCIAL).toBe('financial');
    expect(VaultCategory.WORK).toBe('work');
    expect(VaultCategory.HEALTH).toBe('health');
    expect(VaultCategory.LEGAL).toBe('legal');
    expect(VaultCategory.OTHER).toBe('other');
  });
});

describe('ExpenseCategory', () => {
  it('should have 13 values', () => {
    expect(Object.values(ExpenseCategory)).toHaveLength(13);
  });

  it('should have correct values', () => {
    expect(ExpenseCategory.FOOD).toBe('food');
    expect(ExpenseCategory.TRANSPORT).toBe('transport');
    expect(ExpenseCategory.HOUSING).toBe('housing');
    expect(ExpenseCategory.HEALTH).toBe('health');
    expect(ExpenseCategory.EDUCATION).toBe('education');
    expect(ExpenseCategory.ENTERTAINMENT).toBe('entertainment');
    expect(ExpenseCategory.SHOPPING).toBe('shopping');
    expect(ExpenseCategory.BILLS).toBe('bills');
    expect(ExpenseCategory.SUBSCRIPTIONS).toBe('subscriptions');
    expect(ExpenseCategory.TRAVEL).toBe('travel');
    expect(ExpenseCategory.GIFTS).toBe('gifts');
    expect(ExpenseCategory.INVESTMENTS).toBe('investments');
    expect(ExpenseCategory.OTHER).toBe('other');
  });
});

describe('ALL_* arrays', () => {
  it('ALL_USER_STATUSES should match UserStatus values', () => {
    expect(ALL_USER_STATUSES).toEqual(Object.values(UserStatus));
  });

  it('ALL_LIFE_AREAS should match LifeArea values', () => {
    expect(ALL_LIFE_AREAS).toEqual(Object.values(LifeArea));
  });

  it('ALL_TRACKING_TYPES should match TrackingType values', () => {
    expect(ALL_TRACKING_TYPES).toEqual(Object.values(TrackingType));
  });

  it('ALL_CONVERSATION_TYPES should match ConversationType values', () => {
    expect(ALL_CONVERSATION_TYPES).toEqual(Object.values(ConversationType));
  });

  it('ALL_VAULT_ITEM_TYPES should match VaultItemType values', () => {
    expect(ALL_VAULT_ITEM_TYPES).toEqual(Object.values(VaultItemType));
  });

  it('ALL_VAULT_CATEGORIES should match VaultCategory values', () => {
    expect(ALL_VAULT_CATEGORIES).toEqual(Object.values(VaultCategory));
  });

  it('ALL_EXPENSE_CATEGORIES should match ExpenseCategory values', () => {
    expect(ALL_EXPENSE_CATEGORIES).toEqual(Object.values(ExpenseCategory));
  });
});
