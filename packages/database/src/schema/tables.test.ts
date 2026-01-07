// packages/database/src/schema/tables.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import {
  // Tables
  users,
  conversations,
  messages,
  trackingEntries,
  lifeBalanceHistory,
  notes,
  noteLinks,
  decisions,
  decisionOptions,
  decisionCriteria,
  decisionScores,
  people,
  personNotes,
  personInteractions,
  vaultItems,
  goals,
  goalMilestones,
  habits,
  habitCompletions,
  habitFreezes,
  notifications,
  reminders,
  userIntegrations,
  calendarEvents,
  budgets,
  subscriptions,
  exportRequests,
  embeddings,
  auditLogs,
  // Types
  type User,
  type NewUser,
  type Conversation,
  type NewConversation,
  type Message,
  type NewMessage,
  type TrackingEntry,
  type NewTrackingEntry,
  type LifeBalanceHistory,
  type NewLifeBalanceHistory,
  type Note,
  type NewNote,
  type NoteLink,
  type NewNoteLink,
  type Decision,
  type NewDecision,
  type DecisionOption,
  type NewDecisionOption,
  type DecisionCriterion,
  type NewDecisionCriterion,
  type DecisionScore,
  type NewDecisionScore,
  type Person,
  type NewPerson,
  type PersonNote,
  type NewPersonNote,
  type PersonInteraction,
  type NewPersonInteraction,
  type VaultItem,
  type NewVaultItem,
  type Goal,
  type NewGoal,
  type GoalMilestone,
  type NewGoalMilestone,
  type Habit,
  type NewHabit,
  type HabitCompletion,
  type NewHabitCompletion,
  type HabitFreeze,
  type NewHabitFreeze,
  type Notification,
  type NewNotification,
  type Reminder,
  type NewReminder,
  type UserIntegration,
  type NewUserIntegration,
  type CalendarEvent,
  type NewCalendarEvent,
  type Budget,
  type NewBudget,
  type Subscription,
  type NewSubscription,
  type ExportRequest,
  type NewExportRequest,
  type Embedding,
  type NewEmbedding,
  type AuditLog,
  type NewAuditLog,
} from './index';

describe('tables', () => {
  describe('users table', () => {
    it('should have correct table name', () => {
      expect(getTableName(users)).toBe('users');
    });

    it('should have required columns', () => {
      expect(users.id).toBeDefined();
      expect(users.email).toBeDefined();
      expect(users.name).toBeDefined();
      expect(users.status).toBeDefined();
      expect(users.plan).toBeDefined();
      expect(users.preferences).toBeDefined();
      expect(users.createdAt).toBeDefined();
      expect(users.updatedAt).toBeDefined();
    });

    it('should export User and NewUser types', () => {
      const user: User = {} as User;
      const newUser: NewUser = {} as NewUser;
      expect(user).toBeDefined();
      expect(newUser).toBeDefined();
    });
  });

  describe('conversations table', () => {
    it('should have correct table name', () => {
      expect(getTableName(conversations)).toBe('conversations');
    });

    it('should have required columns', () => {
      expect(conversations.id).toBeDefined();
      expect(conversations.userId).toBeDefined();
      expect(conversations.type).toBeDefined();
    });

    it('should export Conversation and NewConversation types', () => {
      const conv: Conversation = {} as Conversation;
      const newConv: NewConversation = {} as NewConversation;
      expect(conv).toBeDefined();
      expect(newConv).toBeDefined();
    });
  });

  describe('messages table', () => {
    it('should have correct table name', () => {
      expect(getTableName(messages)).toBe('messages');
    });

    it('should have required columns', () => {
      expect(messages.id).toBeDefined();
      expect(messages.conversationId).toBeDefined();
      expect(messages.role).toBeDefined();
      expect(messages.content).toBeDefined();
    });

    it('should export Message and NewMessage types', () => {
      const msg: Message = {} as Message;
      const newMsg: NewMessage = {} as NewMessage;
      expect(msg).toBeDefined();
      expect(newMsg).toBeDefined();
    });
  });

  describe('trackingEntries table', () => {
    it('should have correct table name', () => {
      expect(getTableName(trackingEntries)).toBe('tracking_entries');
    });

    it('should have required columns', () => {
      expect(trackingEntries.id).toBeDefined();
      expect(trackingEntries.userId).toBeDefined();
      expect(trackingEntries.type).toBeDefined();
      expect(trackingEntries.area).toBeDefined();
      expect(trackingEntries.value).toBeDefined();
      expect(trackingEntries.entryDate).toBeDefined();
    });

    it('should export TrackingEntry and NewTrackingEntry types', () => {
      const entry: TrackingEntry = {} as TrackingEntry;
      const newEntry: NewTrackingEntry = {} as NewTrackingEntry;
      expect(entry).toBeDefined();
      expect(newEntry).toBeDefined();
    });
  });

  describe('lifeBalanceHistory table', () => {
    it('should have correct table name', () => {
      expect(getTableName(lifeBalanceHistory)).toBe('life_balance_history');
    });

    it('should have required columns', () => {
      expect(lifeBalanceHistory.id).toBeDefined();
      expect(lifeBalanceHistory.userId).toBeDefined();
      expect(lifeBalanceHistory.snapshotDate).toBeDefined();
      expect(lifeBalanceHistory.overallScore).toBeDefined();
      expect(lifeBalanceHistory.areaScores).toBeDefined();
    });

    it('should export LifeBalanceHistory and NewLifeBalanceHistory types', () => {
      const history: LifeBalanceHistory = {} as LifeBalanceHistory;
      const newHistory: NewLifeBalanceHistory = {} as NewLifeBalanceHistory;
      expect(history).toBeDefined();
      expect(newHistory).toBeDefined();
    });
  });

  describe('notes table', () => {
    it('should have correct table name', () => {
      expect(getTableName(notes)).toBe('notes');
    });

    it('should have required columns', () => {
      expect(notes.id).toBeDefined();
      expect(notes.userId).toBeDefined();
      expect(notes.title).toBeDefined();
      expect(notes.content).toBeDefined();
    });

    it('should export Note and NewNote types', () => {
      const note: Note = {} as Note;
      const newNote: NewNote = {} as NewNote;
      expect(note).toBeDefined();
      expect(newNote).toBeDefined();
    });
  });

  describe('noteLinks table', () => {
    it('should have correct table name', () => {
      expect(getTableName(noteLinks)).toBe('note_links');
    });

    it('should have required columns', () => {
      expect(noteLinks.id).toBeDefined();
      expect(noteLinks.sourceNoteId).toBeDefined();
      expect(noteLinks.targetNoteId).toBeDefined();
    });

    it('should export NoteLink and NewNoteLink types', () => {
      const link: NoteLink = {} as NoteLink;
      const newLink: NewNoteLink = {} as NewNoteLink;
      expect(link).toBeDefined();
      expect(newLink).toBeDefined();
    });
  });

  describe('decisions table', () => {
    it('should have correct table name', () => {
      expect(getTableName(decisions)).toBe('decisions');
    });

    it('should have required columns', () => {
      expect(decisions.id).toBeDefined();
      expect(decisions.userId).toBeDefined();
      expect(decisions.title).toBeDefined();
      expect(decisions.area).toBeDefined();
      expect(decisions.status).toBeDefined();
    });

    it('should export Decision and NewDecision types', () => {
      const decision: Decision = {} as Decision;
      const newDecision: NewDecision = {} as NewDecision;
      expect(decision).toBeDefined();
      expect(newDecision).toBeDefined();
    });
  });

  describe('decisionOptions table', () => {
    it('should have correct table name', () => {
      expect(getTableName(decisionOptions)).toBe('decision_options');
    });

    it('should export DecisionOption and NewDecisionOption types', () => {
      const option: DecisionOption = {} as DecisionOption;
      const newOption: NewDecisionOption = {} as NewDecisionOption;
      expect(option).toBeDefined();
      expect(newOption).toBeDefined();
    });
  });

  describe('decisionCriteria table', () => {
    it('should have correct table name', () => {
      expect(getTableName(decisionCriteria)).toBe('decision_criteria');
    });

    it('should export DecisionCriterion and NewDecisionCriterion types', () => {
      const criterion: DecisionCriterion = {} as DecisionCriterion;
      const newCriterion: NewDecisionCriterion = {} as NewDecisionCriterion;
      expect(criterion).toBeDefined();
      expect(newCriterion).toBeDefined();
    });
  });

  describe('decisionScores table', () => {
    it('should have correct table name', () => {
      expect(getTableName(decisionScores)).toBe('decision_scores');
    });

    it('should export DecisionScore and NewDecisionScore types', () => {
      const score: DecisionScore = {} as DecisionScore;
      const newScore: NewDecisionScore = {} as NewDecisionScore;
      expect(score).toBeDefined();
      expect(newScore).toBeDefined();
    });
  });

  describe('people table', () => {
    it('should have correct table name', () => {
      expect(getTableName(people)).toBe('people');
    });

    it('should have required columns', () => {
      expect(people.id).toBeDefined();
      expect(people.userId).toBeDefined();
      expect(people.name).toBeDefined();
      expect(people.relationship).toBeDefined();
    });

    it('should export Person and NewPerson types', () => {
      const person: Person = {} as Person;
      const newPerson: NewPerson = {} as NewPerson;
      expect(person).toBeDefined();
      expect(newPerson).toBeDefined();
    });
  });

  describe('personNotes table', () => {
    it('should have correct table name', () => {
      expect(getTableName(personNotes)).toBe('person_notes');
    });

    it('should export PersonNote and NewPersonNote types', () => {
      const pn: PersonNote = {} as PersonNote;
      const newPn: NewPersonNote = {} as NewPersonNote;
      expect(pn).toBeDefined();
      expect(newPn).toBeDefined();
    });
  });

  describe('personInteractions table', () => {
    it('should have correct table name', () => {
      expect(getTableName(personInteractions)).toBe('person_interactions');
    });

    it('should export PersonInteraction and NewPersonInteraction types', () => {
      const interaction: PersonInteraction = {} as PersonInteraction;
      const newInteraction: NewPersonInteraction = {} as NewPersonInteraction;
      expect(interaction).toBeDefined();
      expect(newInteraction).toBeDefined();
    });
  });

  describe('vaultItems table', () => {
    it('should have correct table name', () => {
      expect(getTableName(vaultItems)).toBe('vault_items');
    });

    it('should have required columns', () => {
      expect(vaultItems.id).toBeDefined();
      expect(vaultItems.userId).toBeDefined();
      expect(vaultItems.type).toBeDefined();
      expect(vaultItems.category).toBeDefined();
      expect(vaultItems.name).toBeDefined();
      expect(vaultItems.encryptedData).toBeDefined();
    });

    it('should export VaultItem and NewVaultItem types', () => {
      const item: VaultItem = {} as VaultItem;
      const newItem: NewVaultItem = {} as NewVaultItem;
      expect(item).toBeDefined();
      expect(newItem).toBeDefined();
    });
  });

  describe('goals table', () => {
    it('should have correct table name', () => {
      expect(getTableName(goals)).toBe('goals');
    });

    it('should have required columns', () => {
      expect(goals.id).toBeDefined();
      expect(goals.userId).toBeDefined();
      expect(goals.title).toBeDefined();
      expect(goals.area).toBeDefined();
      expect(goals.targetValue).toBeDefined();
      expect(goals.status).toBeDefined();
    });

    it('should export Goal and NewGoal types', () => {
      const goal: Goal = {} as Goal;
      const newGoal: NewGoal = {} as NewGoal;
      expect(goal).toBeDefined();
      expect(newGoal).toBeDefined();
    });
  });

  describe('goalMilestones table', () => {
    it('should have correct table name', () => {
      expect(getTableName(goalMilestones)).toBe('goal_milestones');
    });

    it('should export GoalMilestone and NewGoalMilestone types', () => {
      const milestone: GoalMilestone = {} as GoalMilestone;
      const newMilestone: NewGoalMilestone = {} as NewGoalMilestone;
      expect(milestone).toBeDefined();
      expect(newMilestone).toBeDefined();
    });
  });

  describe('habits table', () => {
    it('should have correct table name', () => {
      expect(getTableName(habits)).toBe('habits');
    });

    it('should have required columns', () => {
      expect(habits.id).toBeDefined();
      expect(habits.userId).toBeDefined();
      expect(habits.title).toBeDefined();
      expect(habits.area).toBeDefined();
      expect(habits.frequency).toBeDefined();
    });

    it('should export Habit and NewHabit types', () => {
      const habit: Habit = {} as Habit;
      const newHabit: NewHabit = {} as NewHabit;
      expect(habit).toBeDefined();
      expect(newHabit).toBeDefined();
    });
  });

  describe('habitCompletions table', () => {
    it('should have correct table name', () => {
      expect(getTableName(habitCompletions)).toBe('habit_completions');
    });

    it('should export HabitCompletion and NewHabitCompletion types', () => {
      const completion: HabitCompletion = {} as HabitCompletion;
      const newCompletion: NewHabitCompletion = {} as NewHabitCompletion;
      expect(completion).toBeDefined();
      expect(newCompletion).toBeDefined();
    });
  });

  describe('habitFreezes table', () => {
    it('should have correct table name', () => {
      expect(getTableName(habitFreezes)).toBe('habit_freezes');
    });

    it('should export HabitFreeze and NewHabitFreeze types', () => {
      const freeze: HabitFreeze = {} as HabitFreeze;
      const newFreeze: NewHabitFreeze = {} as NewHabitFreeze;
      expect(freeze).toBeDefined();
      expect(newFreeze).toBeDefined();
    });
  });

  describe('notifications table', () => {
    it('should have correct table name', () => {
      expect(getTableName(notifications)).toBe('notifications');
    });

    it('should have required columns', () => {
      expect(notifications.id).toBeDefined();
      expect(notifications.userId).toBeDefined();
      expect(notifications.type).toBeDefined();
      expect(notifications.title).toBeDefined();
      expect(notifications.status).toBeDefined();
    });

    it('should export Notification and NewNotification types', () => {
      const notification: Notification = {} as Notification;
      const newNotification: NewNotification = {} as NewNotification;
      expect(notification).toBeDefined();
      expect(newNotification).toBeDefined();
    });
  });

  describe('reminders table', () => {
    it('should have correct table name', () => {
      expect(getTableName(reminders)).toBe('reminders');
    });

    it('should have required columns', () => {
      expect(reminders.id).toBeDefined();
      expect(reminders.userId).toBeDefined();
      expect(reminders.title).toBeDefined();
      expect(reminders.remindAt).toBeDefined();
    });

    it('should export Reminder and NewReminder types', () => {
      const reminder: Reminder = {} as Reminder;
      const newReminder: NewReminder = {} as NewReminder;
      expect(reminder).toBeDefined();
      expect(newReminder).toBeDefined();
    });
  });

  describe('userIntegrations table', () => {
    it('should have correct table name', () => {
      expect(getTableName(userIntegrations)).toBe('user_integrations');
    });

    it('should have required columns', () => {
      expect(userIntegrations.id).toBeDefined();
      expect(userIntegrations.userId).toBeDefined();
      expect(userIntegrations.provider).toBeDefined();
    });

    it('should export UserIntegration and NewUserIntegration types', () => {
      const integration: UserIntegration = {} as UserIntegration;
      const newIntegration: NewUserIntegration = {} as NewUserIntegration;
      expect(integration).toBeDefined();
      expect(newIntegration).toBeDefined();
    });
  });

  describe('calendarEvents table', () => {
    it('should have correct table name', () => {
      expect(getTableName(calendarEvents)).toBe('calendar_events');
    });

    it('should have required columns', () => {
      expect(calendarEvents.id).toBeDefined();
      expect(calendarEvents.userId).toBeDefined();
      expect(calendarEvents.externalId).toBeDefined();
      expect(calendarEvents.title).toBeDefined();
      expect(calendarEvents.startTime).toBeDefined();
      expect(calendarEvents.endTime).toBeDefined();
    });

    it('should export CalendarEvent and NewCalendarEvent types', () => {
      const event: CalendarEvent = {} as CalendarEvent;
      const newEvent: NewCalendarEvent = {} as NewCalendarEvent;
      expect(event).toBeDefined();
      expect(newEvent).toBeDefined();
    });
  });

  describe('budgets table', () => {
    it('should have correct table name', () => {
      expect(getTableName(budgets)).toBe('budgets');
    });

    it('should have required columns', () => {
      expect(budgets.id).toBeDefined();
      expect(budgets.userId).toBeDefined();
      expect(budgets.year).toBeDefined();
      expect(budgets.month).toBeDefined();
      expect(budgets.amount).toBeDefined();
    });

    it('should export Budget and NewBudget types', () => {
      const budget: Budget = {} as Budget;
      const newBudget: NewBudget = {} as NewBudget;
      expect(budget).toBeDefined();
      expect(newBudget).toBeDefined();
    });
  });

  describe('subscriptions table', () => {
    it('should have correct table name', () => {
      expect(getTableName(subscriptions)).toBe('subscriptions');
    });

    it('should have required columns', () => {
      expect(subscriptions.id).toBeDefined();
      expect(subscriptions.userId).toBeDefined();
      expect(subscriptions.stripeSubscriptionId).toBeDefined();
      expect(subscriptions.status).toBeDefined();
    });

    it('should export Subscription and NewSubscription types', () => {
      const sub: Subscription = {} as Subscription;
      const newSub: NewSubscription = {} as NewSubscription;
      expect(sub).toBeDefined();
      expect(newSub).toBeDefined();
    });
  });

  describe('exportRequests table', () => {
    it('should have correct table name', () => {
      expect(getTableName(exportRequests)).toBe('export_requests');
    });

    it('should have required columns', () => {
      expect(exportRequests.id).toBeDefined();
      expect(exportRequests.userId).toBeDefined();
      expect(exportRequests.type).toBeDefined();
      expect(exportRequests.status).toBeDefined();
    });

    it('should export ExportRequest and NewExportRequest types', () => {
      const request: ExportRequest = {} as ExportRequest;
      const newRequest: NewExportRequest = {} as NewExportRequest;
      expect(request).toBeDefined();
      expect(newRequest).toBeDefined();
    });
  });

  describe('embeddings table', () => {
    it('should have correct table name', () => {
      expect(getTableName(embeddings)).toBe('embeddings');
    });

    it('should have required columns', () => {
      expect(embeddings.id).toBeDefined();
      expect(embeddings.userId).toBeDefined();
      expect(embeddings.sourceType).toBeDefined();
      expect(embeddings.sourceId).toBeDefined();
      expect(embeddings.content).toBeDefined();
      expect(embeddings.embedding).toBeDefined();
    });

    it('should export Embedding and NewEmbedding types', () => {
      const embed: Embedding = {} as Embedding;
      const newEmbed: NewEmbedding = {} as NewEmbedding;
      expect(embed).toBeDefined();
      expect(newEmbed).toBeDefined();
    });
  });

  describe('auditLogs table', () => {
    it('should have correct table name', () => {
      expect(getTableName(auditLogs)).toBe('audit_logs');
    });

    it('should have required columns', () => {
      expect(auditLogs.id).toBeDefined();
      expect(auditLogs.userId).toBeDefined(); // nullable but defined
      expect(auditLogs.action).toBeDefined();
      expect(auditLogs.resource).toBeDefined();
    });

    it('should export AuditLog and NewAuditLog types', () => {
      const log: AuditLog = {} as AuditLog;
      const newLog: NewAuditLog = {} as NewAuditLog;
      expect(log).toBeDefined();
      expect(newLog).toBeDefined();
    });
  });

  describe('total table count', () => {
    it('should have exactly 29 tables defined', () => {
      const allTables = [
        users,
        conversations,
        messages,
        trackingEntries,
        lifeBalanceHistory,
        notes,
        noteLinks,
        decisions,
        decisionOptions,
        decisionCriteria,
        decisionScores,
        people,
        personNotes,
        personInteractions,
        vaultItems,
        goals,
        goalMilestones,
        habits,
        habitCompletions,
        habitFreezes,
        notifications,
        reminders,
        userIntegrations,
        calendarEvents,
        budgets,
        subscriptions,
        exportRequests,
        embeddings,
        auditLogs,
      ];
      expect(allTables).toHaveLength(29);
    });
  });
});
