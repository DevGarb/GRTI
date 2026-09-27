# Project decisions

- Maintenance order evidence uses the existing `op_maintenance_photos` table and `op-service-orders` bucket; one gallery serves both opening and closing evidence.
- The 24-hour maintenance clock starts when a new order is created, pauses while awaiting material, and restarts when receipt is reported; this makes the due time explicit without changing legacy deadlines.
- Postponements store an exact due timestamp and required reason separately from weekly scheduled dates; a date-only board cannot express a 24-hour deadline.