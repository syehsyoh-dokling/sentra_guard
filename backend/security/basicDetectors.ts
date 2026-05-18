import type { AuditFinding } from "../types/audit";

interface DetectorRule {
  id: string;
  title: string;
  severity: AuditFinding["severity"];
  pattern: RegExp;
  description: string;
  recommendation: string;
}

const rules: DetectorRule[] = [
  {
    id: "tx-origin-auth",
    title: "Use of tx.origin for authorization",
    severity: "high",
    pattern: /\btx\.origin\b/,
    description:
      "The contract references tx.origin. This can create phishing-style authorization risks.",
    recommendation:
      "Use msg.sender for authorization and apply explicit role-based access control.",
  },
  {
    id: "delegatecall-usage",
    title: "Use of delegatecall",
    severity: "high",
    pattern: /\bdelegatecall\b/,
    description:
      "delegatecall executes code in the context of the calling contract and can be dangerous if not tightly controlled.",
    recommendation:
      "Restrict delegatecall targets and validate upgrade/proxy patterns carefully.",
  },
  {
    id: "selfdestruct-usage",
    title: "Use of selfdestruct",
    severity: "medium",
    pattern: /\bselfdestruct\b/,
    description:
      "selfdestruct can permanently remove contract bytecode and may create lifecycle/security risks.",
    recommendation:
      "Avoid selfdestruct unless it is part of a carefully reviewed lifecycle design.",
  },
  {
    id: "unchecked-low-level-call",
    title: "Possible unchecked low-level call",
    severity: "medium",
    pattern: /\.call\s*\{/,
    description:
      "Low-level calls require explicit success checks and careful reentrancy handling.",
    recommendation:
      "Check the returned success flag and apply reentrancy protection where needed.",
  },
  {
    id: "reentrancy-signal",
    title: "Potential reentrancy-sensitive pattern",
    severity: "medium",
    pattern: /\b(call|transfer|send)\b[\s\S]{0,160}\b(balance|balances|withdraw)\b/i,
    description:
      "The source contains signals commonly associated with reentrancy-sensitive flows.",
    recommendation:
      "Use checks-effects-interactions, ReentrancyGuard, and explicit state updates before external calls.",
  },
];

export function detectBasicVulnerabilities(sourceCode: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const lines = sourceCode.split(/\r?\n/);

  for (const rule of rules) {
    const match = rule.pattern.exec(sourceCode);

    if (!match) {
      continue;
    }

    const matchIndex = match.index;
    const prefix = sourceCode.slice(0, matchIndex);
    const line = prefix.split(/\r?\n/).length;

    findings.push({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      description: rule.description,
      recommendation: rule.recommendation,
      detector: "basic-static-detector",
      line: Math.min(line, lines.length),
    });
  }

  return findings;
}
