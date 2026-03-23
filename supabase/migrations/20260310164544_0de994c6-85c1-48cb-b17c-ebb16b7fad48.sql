-- Update existing tickets: set organization_id from the creator's profile
UPDATE tickets t
SET organization_id = p.organization_id
FROM profiles p
WHERE t.created_by = p.user_id
  AND t.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- Update existing preventive_maintenance: set organization_id from the creator's profile
UPDATE preventive_maintenance pm
SET organization_id = p.organization_id
FROM profiles p
WHERE pm.created_by = p.user_id
  AND pm.organization_id IS NULL
  AND p.organization_id IS NOT NULL;