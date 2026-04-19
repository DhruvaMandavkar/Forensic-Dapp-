import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("VITE_SUPABASE_URL:", supabaseUrl);
  console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "SET" : "NOT SET");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth ──────────────────────────────────────────────────────────

export async function registerUser({ email, password, ...profile }) {
  // Pass profile fields as user metadata so the DB trigger (handle_new_user)
  // can insert the public.users row as SECURITY DEFINER — bypassing RLS timing issues.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { ...profile, email },
    },
  });
  if (authError) throw authError;

  // If email confirmation is disabled in Supabase, session is returned immediately.
  // If not, user must confirm email before logging in.
  if (!authData.session) {
    throw new Error(
      "Registration successful! Please check your email and click the confirmation link before logging in."
    );
  }

  return authData;
}

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      // Profile row missing — trigger may not have run yet (e.g. user registered
      // before trigger was created). Return a minimal object from auth metadata.
      const meta = user.user_metadata || {};
      return {
        id:   user.id,
        email: user.email,
        full_name: meta.full_name || "",
        role: meta.role || null,
        wallet_address: meta.wallet_address || null,
      };
    }

    return profile;
  } catch (err) {
    return null;
  }
}

export async function updateWalletAddress(userId, walletAddress) {
  const { error } = await supabase
    .from("users")
    .update({ wallet_address: walletAddress })
    .eq("id", userId);
  if (error) throw error;
}

// ── Cases ─────────────────────────────────────────────────────────

export async function createCase({ caseNumber, title, description, isPublic }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("cases")
    .insert({
      case_number: caseNumber,
      title,
      description,
      is_public: isPublic,
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCases() {
  console.log("Fetching cases from Supabase...");
  try {
    const { data, error } = await supabase.from("cases").select("*");
    if (error) throw error;
    console.log("Cases fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Error fetching cases:", err);
    throw err;
  }
}

export async function getPublicCases() {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ── Evidence ──────────────────────────────────────────────────────

export async function addEvidence({
  caseId,
  title,
  description,
  evidenceType,
  isConfidential,
  blockchainId,
  txHash,
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("evidence")
    .insert({
      case_id: caseId,
      title,
      description,
      evidence_type: evidenceType,
      is_confidential: isConfidential,
      blockchain_id: blockchainId,
      tx_hash: txHash,
      collected_by: user.id,
      collected_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEvidenceByCase(caseId) {
  console.log(`Fetching evidence for case ID: ${caseId}`);
  try {
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("case_id", caseId);
    if (error) throw error;
    console.log("Evidence fetched successfully:", data);
    return data;
  } catch (err) {
    console.error("Error fetching evidence:", err);
    throw err;
  }
}

export async function verifyEvidence(evidenceId) {
  const { data, error } = await supabase
    .from("evidence")
    .update({ verified: true })
    .eq("id", evidenceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── File Upload ───────────────────────────────────────────────────

export async function uploadFile(file, evidenceId) {
  const ext = file.name.split(".").pop();
  const path = `${evidenceId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("evidence-files")
    .upload(path, file);
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("evidence-files")
    .getPublicUrl(path);

  return { path: data.path, url: urlData.publicUrl };
}

// ── Chain of Custody ──────────────────────────────────────────────

export async function addCustodyRecord({
  evidenceId,
  action,
  notes,
  txHash,
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("chain_of_custody")
    .insert({
      evidence_id: evidenceId,
      handler_id: user.id,
      action,
      notes,
      tx_hash: txHash,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCustodyByEvidence(evidenceId) {
  const { data, error } = await supabase
    .from("chain_of_custody")
    .select("*, users(full_name, role)")
    .eq("evidence_id", evidenceId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return data;
}

// ── Forensic Analysis ─────────────────────────────────────────────

export async function addForensicAnalysis({
  caseId,
  evidenceId,
  analysisType,
  findings,
  toolsUsed,
  isConfidential,
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("forensic_analysis")
    .insert({
      case_id: caseId,
      evidence_id: evidenceId,
      analyst_id: user.id,
      analysis_type: analysisType,
      findings,
      tools_used: toolsUsed,
      is_confidential: isConfidential,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAnalysisByCase(caseId) {
  const { data, error } = await supabase
    .from("forensic_analysis")
    .select("*")
    .eq("case_id", caseId);
  if (error) throw error;
  return data;
}

// ── Court Verification ────────────────────────────────────────────

export async function addCourtVerification({
  evidenceId,
  caseId,
  courtName,
  notes,
  blockchainTx,
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("court_verification")
    .insert({
      evidence_id: evidenceId,
      case_id: caseId,
      verified_by: user.id,
      court_name: courtName,
      notes,
      blockchain_tx: blockchainTx,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCourtVerificationsByCase(caseId) {
  const { data, error } = await supabase
    .from("court_verification")
    .select("*")
    .eq("case_id", caseId);
  if (error) throw error;
  return data;
}

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    console.log("Supabase connection successful:", data);
    return true;
  } catch (err) {
    console.error("Supabase connection failed:", err);
    return false;
  }
}
