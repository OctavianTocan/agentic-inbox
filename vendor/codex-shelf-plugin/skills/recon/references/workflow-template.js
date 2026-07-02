export const meta = {
  name: 'recon',
  description: 'Build verified, no-assumptions understanding of a project section-by-section via read-only subagents, then synthesize one understanding plus explicit open questions.',
  phases: [
    { title: 'Survey', detail: 'one read-only Explore agent per project section' },
    { title: 'Synthesize', detail: 'merge section findings into a verified understanding + open questions' },
  ],
}

// `args` comes from survey.py: { manifest, focus }. The manifest lists the
// sections to divide among subagents; each section names concrete paths to read.
const manifest = (args && args.manifest) || {}
const focus = (args && args.focus) || manifest.focus || null
const sections = manifest.sections || []
const root = manifest.project_root || '.'

// Every section finding must carry evidence and surface its unknowns — the schema
// makes "no assumptions" structural rather than a polite request.
const SECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['section', 'conventions', 'facts', 'commands', 'relevant_skills', 'unknowns', 'key_files'],
  properties: {
    section: { type: 'string' },
    conventions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rule', 'evidence'],
        properties: {
          rule: { type: 'string', description: 'a convention that is actually enforced/followed here' },
          evidence: { type: 'string', description: 'concrete proof: path or path:line where this was observed' },
        },
      },
    },
    facts: { type: 'array', items: { type: 'string' }, description: 'verified facts about this section, each traceable to a file' },
    commands: { type: 'array', items: { type: 'string' }, description: 'build/test/lint/run commands, with where they are defined' },
    relevant_skills: { type: 'array', items: { type: 'string' }, description: 'in-project skills this section points to (esp. for the focus)' },
    unknowns: { type: 'array', items: { type: 'string' }, description: 'anything unclear or unverified — NEVER guessed' },
    key_files: { type: 'array', items: { type: 'string' }, description: 'the files most worth reading in this section' },
  },
}

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overview', 'conventions', 'architecture', 'commands', 'skills_to_follow', 'focus_guidance', 'open_questions', 'confidence'],
  properties: {
    overview: { type: 'string', description: '2-4 sentence orientation to the project' },
    conventions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rule', 'evidence'],
        properties: { rule: { type: 'string' }, evidence: { type: 'string' } },
      },
      description: 'deduplicated conventions across all sections, evidence preserved',
    },
    architecture: { type: 'string', description: 'structure + module boundaries + where domains live, with citations' },
    commands: { type: 'array', items: { type: 'string' } },
    skills_to_follow: { type: 'array', items: { type: 'string' }, description: 'in-project agent skills to activate for this work' },
    focus_guidance: { type: 'string', description: 'convention-grounded guidance for the focus task; empty string if no focus' },
    open_questions: { type: 'array', items: { type: 'string' }, description: 'ALL unknowns rolled up — what is NOT yet verified' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'], description: 'honest coverage assessment' },
  },
}

/** Per-section read-only reconnaissance prompt with no-assumptions discipline. */
function sectionPrompt(s) {
  const kindHint = {
    docs: 'Read each document IN FULL. Extract every stated rule, convention, and command. Quote the doc location for each.',
    skills: 'Open each SKILL.md. For each, capture what it governs and when it must be used — especially any relevant to the focus. List them in relevant_skills.',
    config: 'Open each config file. Extract the rules it ENFORCES (lint/format/type/test settings) and the build/test/lint/run commands, with their source.',
    structure: 'Map the top-level layout and module boundaries: what each top-level dir is, how packages/apps relate, where domain logic lives. Cite directories.',
    code: 'Read representative + entry files. Report conventions ACTUALLY in use (naming, imports, error handling, test layout, types) with path:line evidence. Do not restate the docs — verify against real code.',
    focus: 'This is the deep-dive for the upcoming task. Read these paths closely and report exactly how work like the focus is done here, with citations, and every unknown that would block it.',
  }[s.kind] || 'Read the listed paths thoroughly and report what is verifiably true.'

  return [
    `You are doing READ-ONLY reconnaissance of ONE section of the project at ${root}.`,
    `Section: "${s.title}" (kind: ${s.kind}${s.priority ? ', PRIORITY' : ''}).`,
    `Read these paths thoroughly, plus what they directly reference:`,
    s.paths.map((p) => `  - ${p}`).join('\n'),
    focus ? `\nThe team is about to: "${focus}". Flag anything that bears on it.` : '',
    `\nRULES — no assumptions:`,
    `- Read the actual files. Do NOT report a convention you have not seen in source or docs.`,
    `- Every convention and fact MUST cite evidence as a path or path:line.`,
    `- If something is unclear or you could not verify it, put it in "unknowns". Never guess to fill a gap.`,
    `- Stay within THIS section; do not survey other sections.`,
    kindHint,
    `\nReturn the structured findings.`,
  ].filter(Boolean).join('\n')
}

/** Synthesis prompt: merge findings, preserve citations, roll up every unknown. */
function synthPrompt(findings) {
  return [
    `You are synthesizing READ-ONLY reconnaissance from ${findings.length} sections of ${root} into ONE coherent understanding.`,
    focus ? `The team is about to: "${focus}". Make focus_guidance concrete for that.` : `There is no specific focus; produce a general orientation and leave focus_guidance empty.`,
    `\nSection findings (JSON):`,
    JSON.stringify(findings),
    `\nRULES:`,
    `- Assert only what the findings support; carry their evidence/citations through.`,
    `- Deduplicate conventions across sections but keep the strongest evidence for each.`,
    `- Roll EVERY section's "unknowns" up into open_questions — do not silently drop any. These are what is not yet verified.`,
    `- skills_to_follow: the in-project agent skills that govern this kind of work.`,
    `- Set confidence honestly from coverage and how many open questions remain.`,
  ].join('\n')
}

if (!sections.length) {
  log('No sections in the manifest. Run survey.py first and pass { manifest, focus }.')
  return { error: 'empty manifest', project_root: root }
}

log(`Recon: ${sections.length} sections of ${root}${focus ? ` (focus: ${focus})` : ''}`)

// Barrier is correct here: synthesis needs ALL section findings at once to
// dedupe conventions and roll up unknowns across the whole project.
const findings = (await parallel(
  sections.map((s) => () =>
    agent(sectionPrompt(s), {
      label: `survey:${s.key}`,
      phase: 'Survey',
      agentType: 'Explore',
      schema: SECTION_SCHEMA,
    })
  )
)).filter(Boolean)

const synthesis = await agent(synthPrompt(findings), {
  label: 'synthesize',
  phase: 'Synthesize',
  schema: SYNTH_SCHEMA,
})

return { project_root: root, focus, sections_surveyed: findings.length, synthesis, findings }
