-- Create officers table that references members
CREATE TABLE officers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    FOREIGN KEY (id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT one_org_per_officer UNIQUE (id, org_id)
);

-- Create indexes for better performance
CREATE INDEX idx_officers_org ON officers(org_id);

-- Function to promote member to officer
CREATE OR REPLACE FUNCTION promote_to_officer(
    member_id UUID,
    organization_id UUID,
    officer_position TEXT
) RETURNS void AS $$
BEGIN
    -- Check if the member exists
    IF NOT EXISTS (SELECT 1 FROM members WHERE id = member_id) THEN
        RAISE EXCEPTION 'Member does not exist';
    END IF;

    -- Check if they're already an officer
    IF EXISTS (SELECT 1 FROM officers WHERE id = member_id) THEN
        RAISE EXCEPTION 'Member is already an officer';
    END IF;

    -- Insert the new officer
    INSERT INTO officers (id, org_id, position)
    VALUES (member_id, organization_id, officer_position);
END;
$$ LANGUAGE plpgsql;

-- Function to demote officer to member
CREATE OR REPLACE FUNCTION demote_to_member(
    officer_id UUID
) RETURNS void AS $$
BEGIN
    -- Check if they're an officer
    IF NOT EXISTS (SELECT 1 FROM officers WHERE id = officer_id) THEN
        RAISE EXCEPTION 'Not an officer';
    END IF;

    -- Remove from officers table
    DELETE FROM officers WHERE id = officer_id;
END;
$$ LANGUAGE plpgsql;
