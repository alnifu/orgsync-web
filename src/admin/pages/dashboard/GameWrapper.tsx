// src/admin/pages/dashboard/Wrappers.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import FlappyConfigUploader from "./FlappyConfigUploader";
import CreateQuiz from "../CreateQuiz";

// ---------------- Flappy Config Wrapper ----------------
export function FlappyConfigUploaderWrapper() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("org_managers")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) console.error("Error fetching org:", error);
      setOrgId(data?.org_id || null);
    };

    fetchOrg();
  }, [user]);

  if (!orgId)
    return <p className="text-center text-red-600 mt-6">Organization ID is missing</p>;

  return <FlappyConfigUploader orgId={orgId} />;
}

// ---------------- Quiz Wrapper ----------------
export function CreateQuizWrapper() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("org_managers")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) console.error("Error fetching org:", error);
      setOrgId(data?.org_id || null);
    };

    fetchOrg();
  }, [user]);

  if (!orgId)
    return <p className="text-center text-red-600 mt-6">Organization ID is missing</p>;

  return <CreateQuiz orgId={orgId} />;
}
