-- Migration: Fix debt_payments.month_year to represent the month the installment belongs to
-- Previously: month_year stored when the payment was made
-- Now: month_year stores which month the installment was scheduled for (paidAt stores when paid)

-- Recalculate month_year based on debt.start_month_year + installment_number
-- Formula: belongsToMonth = startMonthYear + (installmentNumber - 1) months
UPDATE debt_payments dp
SET month_year = to_char(
  (to_date(d.start_month_year, 'YYYY-MM') + ((dp.installment_number - 1) || ' months')::interval),
  'YYYY-MM'
)
FROM debts d
WHERE d.id = dp.debt_id
  AND d.start_month_year IS NOT NULL;

-- Add comment to clarify the new semantics
COMMENT ON COLUMN debt_payments.month_year IS 'Month the installment belongs to (YYYY-MM), not when it was paid. Use paid_at for payment date.';
