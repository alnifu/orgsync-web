-- Create advisers table and functions
CREATE TABLE IF NOT EXISTS advisers (
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (member_id, org_id)
);

-- Add RLS policies
ALTER TABLE advisers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisers are viewable by authenticated users"
    ON advisers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Advisers can only be managed by organization officers"
    ON advisers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM officers 
            WHERE officers.org_id = advisers.org_id 
            AND officers.id = auth.uid()
        )
    );

-- Function to assign adviser
CREATE OR REPLACE FUNCTION assign_adviser(
    member_id UUID,
    organization_id UUID
)
RETURNS void AS $$
BEGIN
    -- Check if the user is authorized (is an officer)
    IF NOT EXISTS (
        SELECT 1 FROM officers 
        WHERE org_id = organization_id 
        AND id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only officers can assign advisers';
    END IF;

    -- Check if member exists
    IF NOT EXISTS (SELECT 1 FROM members WHERE id = member_id) THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    -- Insert or update adviser
    INSERT INTO advisers (member_id, org_id)
    VALUES (member_id, organization_id)
    ON CONFLICT (member_id, org_id) 
    DO UPDATE SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove adviser
CREATE OR REPLACE FUNCTION remove_adviser(
    member_id UUID,
    organization_id UUID
)
RETURNS void AS $$
BEGIN
    -- Check if the user is authorized (is an officer)
    IF NOT EXISTS (
        SELECT 1 FROM officers 
        WHERE org_id = organization_id 
        AND id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only officers can remove advisers';
    END IF;

    -- Remove adviser
    DELETE FROM advisers
    WHERE member_id = member_id
    AND org_id = organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete organization
CREATE OR REPLACE FUNCTION delete_organization(
    organization_id UUID,
    org_code_input TEXT
)
RETURNS void AS $$
DECLARE
    actual_org_code TEXT;
BEGIN
    -- Get the actual org_code
    SELECT org_code INTO actual_org_code
    FROM organizations
    WHERE id = organization_id;

    -- Check if the org_code matches
    IF actual_org_code != org_code_input THEN
        RAISE EXCEPTION 'Organization code does not match';
    END IF;

    -- Check if the user is authorized (is an officer)
    IF NOT EXISTS (
        SELECT 1 FROM officers 
        WHERE org_id = organization_id 
        AND id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only officers can delete organizations';
    END IF;

    -- Delete the organization (this will cascade to related tables)
    DELETE FROM organizations
    WHERE id = organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;