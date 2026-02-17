-- Migration 029: Decision Record Immutability
--
-- Prevents tampering with sealed decision records.
-- Once a decision record has an integrity_hash, its core fields
-- (result, input_snapshot, result_details, integrity_hash, previous_hash)
-- become immutable at the database level.
--
-- This satisfies AIFMD II audit trail requirements for tamper-evident records.

-- Function that raises an error when sealed fields are modified
CREATE OR REPLACE FUNCTION prevent_sealed_record_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block modifications to sealed records (those with an integrity_hash)
  IF OLD.integrity_hash IS NOT NULL THEN
    -- Check if any protected field was changed
    IF NEW.result IS DISTINCT FROM OLD.result
       OR NEW.input_snapshot IS DISTINCT FROM OLD.input_snapshot
       OR NEW.result_details IS DISTINCT FROM OLD.result_details
       OR NEW.integrity_hash IS DISTINCT FROM OLD.integrity_hash
       OR NEW.previous_hash IS DISTINCT FROM OLD.previous_hash
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
    THEN
      RAISE EXCEPTION 'Cannot modify sealed decision record (id: %). Sealed records are immutable for audit compliance.', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to decision_records table
DROP TRIGGER IF EXISTS enforce_decision_immutability ON decision_records;

CREATE TRIGGER enforce_decision_immutability
  BEFORE UPDATE ON decision_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sealed_record_tampering();

-- Prevent deletion of any decision records (sealed or not)
CREATE OR REPLACE FUNCTION prevent_decision_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Decision records cannot be deleted. Record id: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_decision_record_delete ON decision_records;

CREATE TRIGGER prevent_decision_record_delete
  BEFORE DELETE ON decision_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_decision_deletion();
