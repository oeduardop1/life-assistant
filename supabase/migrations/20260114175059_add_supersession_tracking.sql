-- Migration: Add supersession tracking for contradiction detection
-- Part of M1.6.1 - Contradiction Detection for Memory System
--
-- This migration adds columns to track when a knowledge item has been
-- superseded by another (newer) item due to contradiction.

-- Add supersession tracking columns
ALTER TABLE knowledge_items
ADD COLUMN superseded_by_id UUID REFERENCES knowledge_items(id),
ADD COLUMN superseded_at TIMESTAMPTZ;

-- Create index for finding active (non-superseded) items by scope
-- Note: Drizzle will create the index via the schema, but we create a partial
-- index here for better performance when querying active items only
CREATE INDEX IF NOT EXISTS knowledge_items_user_active_idx
ON knowledge_items (user_id, type, area)
WHERE superseded_by_id IS NULL AND deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN knowledge_items.superseded_by_id IS 'Reference to the item that superseded this one due to contradiction';
COMMENT ON COLUMN knowledge_items.superseded_at IS 'Timestamp when this item was superseded';
