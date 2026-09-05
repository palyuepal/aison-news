import { evidenceLabels, type EvidenceLevel } from "@/data/supplements";

export default function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <span className={`evidenceBadge evidence-${level}`}>{evidenceLabels[level].label}</span>;
}
