// TrustScore Stage 1 — shared client-side types (mirrors API contract in /api/v1/*)

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  status: string;
  role: string; // USER | REVIEWER (Stage 7) | ADMIN (Stage 8 — operational grants)
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface ActivityEvent {
  id: string;
  action: string;
  createdAt: string;
  metadata?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  stage: string;
  version: string;
  db: "up" | "down";
  uptimeSec: number;
  time: string;
}

// ---------------------------------------------------------------------------
// Stage 2–3 — NINAuth identity types (mirror /api/v1/identity/* responses)
// ---------------------------------------------------------------------------

export interface ConsentField {
  scope: string;
  label: string;
  description: string;
  core?: boolean;
}

export interface ConsentScreenInfo {
  requester: string;
  purpose: string;
  fields: ConsentField[];
  policyVersion: string;
  provider: string;
  mode: "MOCK" | "LIVE";
}

// Stage 3 — consent scope metadata (which are core, which optional opt-ins)
export interface ScopeOption {
  scope: string;
  label: string;
  description: string;
  core: boolean;
}

export interface VerificationSessionInfo {
  id: string;
  status:
    | "AWAITING_CONSENT"
    | "CONSENT_GRANTED"
    | "CONSENT_DENIED"
    | "COMPLETED"
    | "FAILED"
    | "EXPIRED";
  provider: string;
  providerMode: string;
  flow: "QR" | "SHARE_CODE";
  shareCode: string;
  authorizationUrl: string;
  scopes: string[];
  purpose: string;
  expiresAt: string;
  createdAt: string;
  ttlMs: number;
}

export interface TrustIdentityInfo {
  status: "PENDING" | "VERIFIED" | "EXPIRED" | "REVOKED" | "NONE";
  assuranceLevel: number;
  provider: string;
  providerMode: string;
  providerIdentityRef: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  requester: string;
  purpose: string;
  scopes: string[];
  policyVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
}

// ---------------------------------------------------------------------------
// Stage 3 — Trust Identity management (assurance ladder, hashed identifiers,
// consent-scoped attributes, evidence with provenance + freshness)
// ---------------------------------------------------------------------------

export interface AssuranceRung {
  level: number;
  key: string;
  title: string;
  detail: string;
  stage: string;
  achieved: boolean;
}

export interface IdentifierInfo {
  id: string;
  type: string;
  hint: string;
  status: string;
  verifiedAt: string;
  expiresAt: string | null;
  hashPrefix: string;
}

export interface AttributeInfo {
  id: string;
  key: string;
  value: string;
  scope: string;
  status: string;
  source: string;
  assertedAt: string;
  expiresAt: string | null;
  consentId: string;
}

export interface EvidenceInfo {
  id: string;
  type: string;
  provider: string;
  providerMode: string;
  summary: string;
  confidence: number;
  status: string;
  collectedAt: string;
  expiresAt: string | null;
}

export interface IdentityMe {
  identity: TrustIdentityInfo;
  ladder: AssuranceRung[];
  identifiers: IdentifierInfo[];
  attributes: AttributeInfo[];
  evidence: EvidenceInfo[];
  consents: ConsentRecord[];
  signals: SignalsMe | null;
  lastSession: {
    id: string;
    status: string;
    provider: string;
    providerMode: string;
    flow: string;
    createdAt: string;
    events: VerificationTimelineEvent[];
  } | null;
}

export interface VerificationTimelineEvent {
  id: string;
  eventType: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Stage 4 — Trust signals (phone OTP + biometric liveness + cross-signal
// consistency). Mirrors /api/v1/identity/me → signals.
// ---------------------------------------------------------------------------

export interface PhoneInProgress {
  id: string;
  phoneHint: string;
  expiresAt: string;
  attemptsLeft: number;
  resendsLeft: number;
}

export interface PhoneSignalInfo {
  status: "NONE" | "ACTIVE" | "REVOKED" | "EXPIRED";
  hint: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  simSwapRisk: "LOW" | "MEDIUM" | "HIGH" | null;
  consentId: string | null;
  inProgress: PhoneInProgress | null;
}

export interface BiometricSignalInfo {
  status: "NONE" | "ACTIVE" | "REVOKED" | "EXPIRED";
  verifiedAt: string | null;
  expiresAt: string | null;
  lastScores: { liveness: number; faceMatch: number; confidence: number } | null;
  consentId: string | null;
  inProgress: { id: string; expiresAt: string } | null;
}

export interface CrossSignalCheckInfo {
  key: string;
  label: string;
  ok: boolean;
}

export interface CrossSignalInfo {
  consistent: boolean;
  eligibleLevel: number;
  checks: CrossSignalCheckInfo[];
}

export interface SignalsMe {
  phone: PhoneSignalInfo;
  biometric: BiometricSignalInfo;
  crossSignal: CrossSignalInfo;
  providers: {
    phone: { name: string; mode: "MOCK" | "LIVE" };
    liveness: { name: string; mode: "MOCK" | "LIVE" };
  };
}

// ---------------------------------------------------------------------------
// Stage 4 — signal action payloads (mirror /api/v1/identity/signals/*)
// ---------------------------------------------------------------------------

export interface PhoneStartResponse {
  verification: {
    id: string;
    phoneHint: string;
    status: string;
    attemptsLeft: number;
    resendsLeft: number;
    expiresAt: string;
    provider: string;
    providerMode: string;
  };
  consent: { id: string; purpose: string };
  delivery: { mode: string; channel: string; provider: string; message: string };
}

export interface PhoneConfirmResponse {
  verification: { id: string; status: string; phoneHint: string };
  identifier: { type: string; hint: string; status: string; expiresAt: string };
  assuranceLevel: number;
  escalated: boolean;
  simSwapRisk: string;
}

export interface LivenessStartResponse {
  session: {
    id: string;
    jobId: string;
    status: string;
    expiresAt: string;
    provider: string;
    providerMode: string;
    instructions: string[];
  };
  consent: { id: string; purpose: string };
}

export interface LivenessVerdictInfo {
  passed: boolean;
  livenessScore: number;
  faceMatchScore: number;
  consistent: boolean;
  reason: string;
  confidence: number;
  bound?: boolean;
}

export interface LivenessCompleteResponse {
  session: { id: string; status: string };
  verdict: LivenessVerdictInfo;
  assuranceLevel: number;
}

// ---------------------------------------------------------------------------
// Stage 5 — Trust Passport types (mirror /api/v1/passport/* responses)
// ---------------------------------------------------------------------------

export interface ScoreComponentInfo {
  key: string;
  label: string;
  value: number;
  max: number;
  note: string;
}

export interface TrustScoreInfo {
  id: string;
  version: number;
  status: "NEW" | "VERIFIED" | "ESTABLISHED" | "CAUTION" | "HIGH_RISK" | "REVIEW_REQUIRED";
  score: number;
  confidence: number;
  riskBand: "LOW" | "MEDIUM" | "HIGH";
  components: ScoreComponentInfo[];
  explanation: string[];
  trigger: string;
  computedAt: string;
  expiresAt: string;
  fresh: boolean;
  // Stage 8 — lifecycle + policy provenance
  state?: "ACTIVE" | "STALE" | "FROZEN" | "RETIRED";
  policyId?: string | null;
  frozenAt?: string | null;
  frozenReason?: string | null;
}

export interface CredentialInfo {
  id: string;
  type: string;
  label: string;
  issuer: string;
  issuerMode: string;
  claims: Record<string, unknown>;
  status: string;
  manualRevoked: boolean;
  evidenceId: string | null;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface ShareTokenInfo {
  id: string;
  scopes: string[];
  maxViews: number;
  views: number;
  viewsLeft: number;
  status: string;
  expiresAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  createdAt: string;
}

export interface ShareTokenCreated {
  token: string;
  linkPath: string;
  id: string;
  scopes: string[];
  maxViews: number;
  expiresAt: string;
}

export interface TrustReceiptInfo {
  id: string;
  viewerLabel: string;
  channel: string;
  viewedAt: string;
  shown: Record<string, unknown>;
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  ipHashPrefix: string | null;
  current: boolean;
}

export interface NotificationInfo {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface DsrRequestInfo {
  id: string;
  type: string;
  status: string;
  detail: string | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface PassportMe {
  profile: {
    displayName: string;
    handle: string;
    email: string;
    memberSince: string;
    status: string;
  } | null;
  assurance: { level: number };
  score: TrustScoreInfo;
  credentials: CredentialInfo[];
  shareTokens: ShareTokenInfo[];
  receipts: TrustReceiptInfo[];
  sessions: SessionInfo[];
  activeSessionCount: number;
  notifications: NotificationInfo[];
  unreadNotifications: number;
  securityEvents: { id: string; action: string; createdAt: string }[];
  cardLanguage: { adverse: string; disclaimer: string };
}

export interface PublicTrustCard {
  viewerNotice: string;
  language: { adverse: string; disclaimer: string };
  freshness: { computedAt: string; expiresAt: string };
  profile?: { displayName: string; handle: string };
  score?: {
    status: string;
    score: number;
    confidence: number;
    riskBand: string;
    components: ScoreComponentInfo[];
  };
  assurance?: { level: number };
  signals?: { type: string; hint: string; verifiedAt: string; expiresAt: string | null }[];
  attributes?: { key: string; value: string }[];
  credentialsCount: number;
}

// ---------------------------------------------------------------------------
// Stage 6 — Safety Check + Trust Requests (mirror /api/v1/safety/* responses)
// ---------------------------------------------------------------------------

export interface SafetySettings {
  enabled: boolean;
  includeProfile: boolean;
  includeSignals: boolean;
  allowPhoneMatch: boolean;
  consentId: string | null;
  grantedAt: string | null;
}

export interface SafetyAssessment {
  method: "HANDLE" | "PHONE" | "TRUST_LINK" | "QR";
  checkedAt: string;
  headline: string;
  summary: {
    status: string;
    riskBand: string;
    assuranceLevel: number;
  };
  subject?: { displayName: string; handle: string } | null;
  signals?: { type: string; hint: string; verifiedAt: string; expiresAt: string | null }[];
  credentialsCount: number;
  score?: { score: number; confidence: number };
  attributes?: { key: string; value: string }[];
  freshness: { assessedAt: string; expiresAt: string; fresh: boolean };
  explanation: string[];
  language: { adverse: string; disclaimer: string };
}

export interface SafetyCheckRunResponse {
  outcome: "OK" | "SELF" | "UNAVAILABLE" | "DEAD_LINK";
  checkId?: string;
  message?: string;
  reason?: string;
  receipted?: boolean;
  assessment?: SafetyAssessment;
}

export interface SafetyCheckHistoryItem {
  id: string;
  method: string;
  subject: { displayName: string; handle: string } | null;
  status: string | null;
  riskBand: string | null;
  headline: string | null;
  checkedAt: string;
  self: boolean;
}

export interface TrustRequestInfo {
  id: string;
  subject?: { displayName: string; handle: string } | null; // sent requests
  verifier?: { displayName: string; handle: string } | null; // received requests
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  message: string;
  respondedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface SafetyChecksResponse {
  checks: SafetyCheckHistoryItem[];
  requests: TrustRequestInfo[];
}

export interface SafetyCheckReceived {
  id: string;
  verifier: { displayName: string; handle: string } | null;
  method: string;
  checkedAt: string;
  shown: {
    headline: string | null;
    status: string | null;
    signalsCount: number;
  };
}

export interface SafetyMe {
  settings: SafetySettings;
  stats: { totalChecks: number; last7Days: number; lastCheckAt: string | null };
  checksReceived: SafetyCheckReceived[];
  requestsReceived: TrustRequestInfo[];
  language: { adverse: string; disclaimer: string };
}

export interface TrustRequestAcceptResponse {
  outcome: "OK";
  decision: "ACCEPTED" | "DECLINED";
  token?: string;
  linkPath?: string;
}

// ---------------------------------------------------------------------------
// Stage 7 — Reputation (flags, resolutions, appeals, verified interactions)
// ---------------------------------------------------------------------------

export interface FlagEvidenceInfo {
  id: string;
  role: string; // REPORTER | SUBJECT
  kind: string; // TEXT | LINK
  content: string;
  createdAt: string;
}

export interface FlagResolutionInfo {
  outcome: string; // CONFIRMED | UNFOUNDED | DISMISSED
  rationale: string;
  decidedAt: string;
}

export interface FlagAppealInfo {
  status: string; // PENDING | UPHELD | OVERTURNED
  reason?: string;
  decisionNote?: string | null;
  decidedAt?: string | null;
}

export interface FlagAgainstMe {
  id: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: string; // OPEN | UNDER_REVIEW | RESOLVED_* | WITHDRAWN
  reporter: { maskedHandle: string; assuranceLevel: number };
  evidence: FlagEvidenceInfo[];
  myResponse: { content: string; at: string } | null;
  myEvidence: FlagEvidenceInfo[];
  resolution: FlagResolutionInfo | null;
  appeal: FlagAppealInfo | null;
  canRespond: boolean;
  canAppeal: boolean;
  appealWindowEndsAt: string | null;
  createdAt: string;
  subjectRespondedAt: string | null;
}

export interface FlagFiledByMe {
  id: string;
  subjectHandle: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: string;
  evidenceCount: number;
  resolution: FlagResolutionInfo | null;
  appeal: { status: string } | null;
  canWithdraw: boolean;
  createdAt: string;
}

export interface ReputationStats {
  openAgainstMe: number;
  confirmedAgainstMe: number;
  clearedAgainstMe: number;
  filedByMe: number;
}

export interface ReputationMe {
  role: string; // USER | REVIEWER
  canFileFlags: boolean;
  myAssuranceLevel: number;
  flagWindow: { max: number; days: number };
  appealWindowDays: number;
  flagsAgainstMe: FlagAgainstMe[];
  flagsFiledByMe: FlagFiledByMe[];
  stats: ReputationStats;
  maskNote: string;
}

export interface ReviewQueueFlag {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  subjectRespondedAt: string | null;
  reporter: { handle: string; displayName: string; assuranceLevel: number };
  subject: { handle: string; displayName: string; assuranceLevel: number };
  evidence: FlagEvidenceInfo[];
}

export interface ReviewQueueAppeal {
  id: string;
  reason: string;
  createdAt: string;
  flag: {
    id: string;
    category: string;
    description: string;
    status: string;
    createdAt: string;
    reporter: { handle: string; displayName: string };
    subject: { handle: string; displayName: string };
    resolution: { outcome: string; rationale: string; decidedAt: string } | null;
    evidence: FlagEvidenceInfo[];
  };
}

export interface ReviewQueue {
  queue: ReviewQueueFlag[];
  appeals: ReviewQueueAppeal[];
  reviewerHandleNote: string;
}

export interface ScoreContributionInfo {
  verifiedInteractions: number;
  reputationPoints: number;
  resolutionPoints: number;
  confirmedPenalty: number;
}

// ---------------------------------------------------------------------------
// Stage 8 — Trust Engine
// ---------------------------------------------------------------------------

export interface PolicyRulesInfo {
  assuranceBase: number[]; // L0..L4
  freshnessFullDays: number;
  freshnessMinFactor: number;
  credentialPoints: number;
  credentialMax: number;
  interactionPoints: number;
  interactionWindowDays: number;
  interactionMax: number;
  clearedPoints: number;
  clearedMax: number;
  riskPenaltyPer: number;
  riskMaxPenalty: number;
  riskHighAt: number;
  snapshotTtlHours: number;
  establishedMinLevel: number;
}

export interface PolicyInfo {
  id: string;
  version: number;
  status: string; // DRAFT | ACTIVE | RETIRED
  rules: PolicyRulesInfo;
  changeSummary: string;
  activatedAt: string | null;
  createdAt: string;
}

export interface DpiaRegistryEntry {
  status: string;
  residualRisk: string | null;
  policyVersion: number | null;
  completedAt: string | null;
}

export interface EnginePublic {
  activePolicy: {
    version: number;
    activatedAt: string | null;
    changeSummary: string;
    rules: PolicyRulesInfo;
  } | null;
  policyHistory: {
    version: number;
    status: string;
    changeSummary: string;
    activatedAt: string | null;
  }[];
  dpia: {
    status: string; // COMPLETED | REQUIRED
    completedAt: string | null;
    residualRisk: string | null;
    summary: string | null;
  };
  dpiRegistry: DpiaRegistryEntry[];
  automatedSignificantDecisions: boolean;
  gateNote: string;
  language: string;
}

export interface EngineMe {
  snapshot: {
    state: string; // ACTIVE | STALE | FROZEN | RETIRED
    frozenReason: string | null;
    frozenAt: string | null;
    policyVersion: number | null;
    computedAt: string;
    expiresAt: string;
    trigger: string;
  } | null;
  policy: { version: number; changeSummary: string; activatedAt: string | null } | null;
  automatedSignificantDecisions: boolean;
  frozenNote: string | null;
  // Stage 8 — snapshot history (oldest → newest, latest 20 rows) feeding
  // the member's score-over-time sparkline + lifecycle log.
  history: {
    score: number;
    status: string;
    state: string;
    trigger: string;
    computedAt: string;
    policyVersion: number | null;
  }[];
}

export interface PolicySimulation {
  draftVersion: number;
  activeVersion: number | null;
  cohort: number;
  frozenExcluded: number;
  moved: number;
  avgBefore: number;
  avgAfter: number;
  avgDelta: number;
  maxUp: number;
  maxDown: number;
  buckets: { label: string; before: number; after: number }[];
  transitions: { from: string; to: string; count: number }[];
  movers: {
    label: string;
    before: number;
    after: number;
    delta: number;
    statusBefore: string;
    statusAfter: string;
  }[];
  note: string;
}

export interface DpiaAdminRecord {
  id: string;
  policyVersion: number | null;
  status: string;
  summary: string;
  residualRisk: string;
  checklist: { id: string; label: string; done: boolean }[];
  completedAt: string | null;
  createdAt: string;
}

export interface EngineAdminOverview {
  gate: { automatedSignificantDecisions: boolean; note: string };
  policies: PolicyInfo[];
  dpia: DpiaAdminRecord[];
  snapshots: { total: number; byState: Record<string, number> };
}

export const DPIA_CHECKLIST_IDS = [
  "scope",
  "special",
  "necessity",
  "rights",
  "bias",
  "security",
  "human",
  "retention",
] as const;

// ---------------------------------------------------------------------------
// Stage 9 — B2B Platform (developer portal, Trust Decision API)
// ---------------------------------------------------------------------------

export interface DevKey {
  id: string;
  name: string;
  keyPrefix: string;
  scope: string;
  status: string;
  totalRequests: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface DevTeamMember {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  role: "OWNER" | "DEVELOPER" | "VIEWER";
  isYou: boolean;
  createdAt: string;
}

export interface DevDelivery {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  statusCode: number | null;
  responseSnippet: string | null;
  signature: string | null;
  durationMs: number | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface DevClient {
  id: string;
  name: string;
  environment: string;
  status: string;
  plan: string;
  role: "OWNER" | "DEVELOPER" | "VIEWER";
  quota: { plan: number; usedToday: number; remaining: number };
  usage: { day: string; checks: number; errors: number }[];
  webhook: {
    url: string | null;
    hasSecret: boolean;
    secretCreatedAt: string | null;
    recentDeliveries: DevDelivery[];
  };
  keys: DevKey[];
  team: DevTeamMember[];
  decisionsCount: number;
  createdAt: string;
}

export interface DevPortal {
  you: { handle: string; displayName: string };
  clients: DevClient[];
  limits: { maxClients: number; plans: Record<string, { quota: number; keys: number }> };
  honesty: string;
}

export interface DevDecision {
  id: string;
  method: string;
  inputHint: string;
  outcome: string;
  requestId: string;
  createdAt: string;
  assessment: Record<string, unknown> | null;
}

export interface MintedKeyResponse {
  key: DevKey & { rawKey: string };
  warning: string;
}
