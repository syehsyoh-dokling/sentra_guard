export const detectorRules = [
  {
    id: "tx-origin-auth",
    title: "Use of tx.origin for authorization",
    severity: "high",
    engine: "static",
    pattern: /\btx\.origin\b/,
    description: "The contract references tx.origin, which can create phishing-style authorization risk.",
    recommendation: "Use msg.sender and explicit role-based access control for authorization."
  },
  {
    id: "delegatecall-usage",
    title: "Use of delegatecall",
    severity: "high",
    engine: "static",
    pattern: /\bdelegatecall\b/,
    description: "delegatecall executes external code in the calling contract context.",
    recommendation: "Restrict delegatecall targets and review upgrade/proxy controls carefully."
  },
  {
    id: "unchecked-low-level-call",
    title: "Possible unchecked low-level call",
    severity: "medium",
    engine: "static",
    pattern: /\.call\s*(?:\{|\.value|\()/,
    description: "Low-level calls need explicit success checks and defensive handling.",
    recommendation: "Check the returned success flag and apply reentrancy protection where needed."
  },
  {
    id: "selfdestruct-usage",
    title: "Use of selfdestruct",
    severity: "medium",
    engine: "static",
    pattern: /\bselfdestruct\b/,
    description: "selfdestruct can permanently remove bytecode and complicate lifecycle safety.",
    recommendation: "Avoid selfdestruct unless the lifecycle design is intentional and reviewed."
  },
  {
    id: "missing-access-control",
    title: "Privileged function may lack access control",
    severity: "high",
    engine: "heuristic",
    pattern: /function\s+\w*(?:upgrade|mint|pause|withdraw|setOwner|setAdmin)\w*\s*\([^)]*\)\s*(?:public|external)(?![^{;]*(?:onlyOwner|onlyRole|auth|admin))/i,
    description: "A sensitive public/external function does not show an obvious access-control modifier.",
    recommendation: "Protect privileged operations with Ownable, AccessControl, or equivalent authorization."
  },
  {
    id: "reentrancy-signal",
    title: "Potential reentrancy-sensitive flow",
    severity: "medium",
    engine: "heuristic",
    pattern: /\b(call|transfer|send)\b[\s\S]{0,220}\b(balance|balances|withdraw|claim)\b/i,
    description: "External value transfer appears near balance/withdrawal logic.",
    recommendation: "Use checks-effects-interactions and ReentrancyGuard for value-transfer flows."
  },
  {
    id: "pragma-floating-version",
    title: "Floating Solidity compiler pragma",
    severity: "low",
    engine: "metadata",
    pattern: /pragma\s+solidity\s+\^/,
    description: "Floating compiler versions can produce different bytecode across environments.",
    recommendation: "Pin compiler versions for audited/deployed contracts."
  }
];

const severityScore = {
  info: 1,
  low: 2,
  medium: 4,
  high: 7,
  critical: 10
};

function findLine(sourceCode, index) {
  return sourceCode.slice(0, index).split(/\r?\n/).length;
}

export function detectVulnerabilities(sourceCode = "") {
  const source = String(sourceCode);
  const findings = [];
  const totalLines = Math.max(1, source.split(/\r?\n/).length);

  for (const rule of detectorRules) {
    const match = rule.pattern.exec(source);

    if (!match) continue;

    findings.push({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      description: rule.description,
      recommendation: rule.recommendation,
      detector: rule.engine,
      confidence: Math.min(0.95, 0.58 + severityScore[rule.severity] / 20),
      line: Math.min(findLine(source, match.index), totalLines)
    });
  }

  return findings.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
}

export function getDetectorRulesResponse() {
  return {
    version: "2026.05-production-ready",
    mode: "static-heuristic-engine",
    rules: detectorRules.map(({ pattern, ...rule }) => ({
      ...rule,
      enabled: true,
      patternPreview: pattern.source
    }))
  };
}
