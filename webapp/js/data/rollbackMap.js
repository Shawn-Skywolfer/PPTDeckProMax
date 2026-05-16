/**
 * Rollback Map — ported from references/review_rollback_map.json
 * Maps finding types to rollback stage, role, and target files.
 */

export const ROLLBACK_MAP = {
  "geometry_broken": {
    "rollback_stage": "geometry",
    "target_role": "visual",
    "target_files": ["deck_page_skeletons.md", "deck_geometry_rules.md"],
    "why": "Structural alignment/connection failures in the actual built artifact.",
    "suggested_action": "Revisit page skeletons and geometry rules; rebuild affected pages."
  },
  "layout_alignment": {
    "rollback_stage": "geometry",
    "target_role": "visual",
    "target_files": ["deck_page_skeletons.md", "deck_geometry_rules.md", "deck_visual_system.md"],
    "why": "Elements deviate from intended alignment axes.",
    "suggested_action": "Update skeletons and geometry rules, then propagate to visual system."
  },
  "visual_hierarchy": {
    "rollback_stage": "visual_system",
    "target_role": "visual",
    "target_files": ["deck_visual_system.md", "deck_component_tokens.md", "deck_theme_tokens.json"],
    "why": "Eye-flow is unclear; visual weight distribution broken.",
    "suggested_action": "Revise visual system tokens and component hierarchy."
  },
  "component_drift": {
    "rollback_stage": "visual_system",
    "target_role": "visual",
    "target_files": ["deck_visual_system.md", "deck_component_tokens.md", "deck_theme_tokens.json"],
    "why": "Built components diverge from locked token definitions.",
    "suggested_action": "Re-lock tokens and rebuild drifting components."
  },
  "audience_mismatch": {
    "rollback_stage": "brief",
    "target_role": "brief",
    "target_files": ["deck_brief.md", "deck_clean_pages.md"],
    "why": "Content does not resonate with stated decision-maker.",
    "suggested_action": "Revisit audience definition in brief and rewrite pages."
  },
  "buying_reason_blurry": {
    "rollback_stage": "brief",
    "target_role": "brief",
    "target_files": ["deck_brief.md", "deck_hero_pages.md", "deck_clean_pages.md"],
    "why": "First buying reason not clear within first 5 pages.",
    "suggested_action": "Sharpen brief and front-load buying reason on hero pages."
  },
  "hero_page_weak": {
    "rollback_stage": "hero_pages",
    "target_role": "brief",
    "target_files": ["deck_hero_pages.md", "deck_clean_pages.md"],
    "why": "Hero page lacks visual or narrative punch.",
    "suggested_action": "Re-select hero pages and strengthen copy + visuals."
  },
  "proof_not_visible": {
    "rollback_stage": "hero_pages",
    "target_role": "brief",
    "target_files": ["deck_hero_pages.md", "deck_clean_pages.md"],
    "why": "Strongest evidence is buried or missing.",
    "suggested_action": "Move proof to hero pages and make it self-explanatory."
  },
  "objection_unanswered": {
    "rollback_stage": "hero_pages",
    "target_role": "brief",
    "target_files": ["deck_brief.md", "deck_clean_pages.md", "deck_hero_pages.md"],
    "why": "Key objection flagged in brief lacks preemptive response.",
    "suggested_action": "Add objection-handling content to hero or adjacent pages."
  },
  "cta_weak": {
    "rollback_stage": "brief",
    "target_role": "brief",
    "target_files": ["deck_brief.md", "deck_hero_pages.md", "deck_clean_pages.md"],
    "why": "Final CTA lacks specificity or urgency.",
    "suggested_action": "Rewrite CTA with threshold control and deliverable promise."
  },
  "narrative_broken": {
    "rollback_stage": "narrative_arc",
    "target_role": "brief",
    "target_files": ["deck_narrative_arc.md", "deck_hero_pages.md", "deck_clean_pages.md"],
    "why": "Logical progression disrupted.",
    "suggested_action": "Re-sequence beats and fix transition logic."
  },
  "pacing_monotone": {
    "rollback_stage": "clean_pages",
    "target_role": "brief",
    "target_files": ["deck_clean_pages.md", "deck_narrative_arc.md"],
    "why": "Density or rhythm too uniform; no breathing pages.",
    "suggested_action": "Insert breathing pages and alternate density."
  },
  "density_issue": {
    "rollback_stage": "clean_pages",
    "target_role": "brief",
    "target_files": ["deck_clean_pages.md", "deck_layout_v1.md"],
    "why": "Page copy exceeds 700 chars or visual protagonist < 40%.",
    "suggested_action": "Compress copy or split page; re-layout."
  },
  "content_thin": {
    "rollback_stage": "expert_interview",
    "target_role": "brief",
    "target_files": ["deck_expert_context.md", "deck_clean_pages.md"],
    "why": "Hero claim richness < 3/5 or expert data ignored.",
    "suggested_action": "Return to expert interview or supplement with real data."
  },
  "redaction_incomplete": {
    "rollback_stage": "redaction_review",
    "target_role": "brief",
    "target_files": ["deck_expert_context.md"],
    "why": "Expert context still contains unapproved sensitive data.",
    "suggested_action": "Complete redaction review before downstream use."
  },
  "internal_language_leak": {
    "rollback_stage": "clean_pages",
    "target_role": "brief",
    "target_files": ["deck_clean_pages.md"],
    "why": "Production terminology visible in customer-facing copy.",
    "suggested_action": "Strip all internal jargon and workflow terms."
  },
  "world_incomplete": {
    "rollback_stage": "visual_composition",
    "target_role": "visual",
    "target_files": ["deck_visual_composition.md", "deck_clean_pages.md", "deck_brief.md"],
    "why": "Reader perceives 'proposal' rather than 'existing system'.",
    "suggested_action": "Replace placeholders with concept UI or real screenshots."
  },
  "visual_flat": {
    "rollback_stage": "visual_composition",
    "target_role": "visual",
    "target_files": ["deck_visual_composition.md", "deck_clean_pages.md"],
    "why": "Too many pages lack visual protagonist or use same type.",
    "suggested_action": "Diversify visual protagonists across pages."
  },
  "asset_missing": {
    "rollback_stage": "asset_plan",
    "target_role": "brief",
    "target_files": ["deck_asset_plan.md", "asset_manifest.json", "deck_clean_pages.md"],
    "why": "Required screenshot or image not provided.",
    "suggested_action": "Capture or generate missing assets, or apply branded placeholders."
  },
  "generic_ai_feel": {
    "rollback_stage": "visual_system",
    "target_role": "visual",
    "target_files": ["deck_vibe_brief.md", "deck_visual_system.md", "deck_component_tokens.md"],
    "why": "Visual style feels templated or AI-generated.",
    "suggested_action": "Inject more specific brand personality into tokens and compositions."
  },
  "other": {
    "rollback_stage": "manual_review",
    "target_role": "review",
    "target_files": [],
    "why": "Unclassified finding requiring human reclassification.",
    "suggested_action": "Reclassify the finding before routing to rework."
  }
};

export function getRollbackPlan(findingType) {
  return ROLLBACK_MAP[findingType] || ROLLBACK_MAP["other"];
}

export const FINDING_TYPES = Object.keys(ROLLBACK_MAP);

export const FINDING_SEVERITIES = ["low", "medium", "high", "critical"];
