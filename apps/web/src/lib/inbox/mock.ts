import type { Email, Inbox, InboxItem, InboxSummary } from './types';

const emails = {
  'e-010': {
    id: 'e-010',
    from: 'Carlos Ramirez <c.ramirez@allianceconstruction.com>',
    to: ['pm@firm.com'],
    cc: ['super@allianceconstruction.com'],
    subject:
      'Maplewood Senior Living - PCO #14 Unforeseen rock at south wing footings',
    body: "PM,\n\nDuring excavation for the south wing footings F-12 through F-18, our crews encountered solid rock approximately 3' below the planned bearing elevation. This was not indicated on the geotech report, which we've re-pulled and shared with our PE for review.\n\nWe need a directive to proceed. Options:\n1. Rock removal via mechanical means - 4 days, est. $48,500\n2. Redesign footings to bear on rock - needs structural review\n\nWe are holding the south wing crew until we hear back. Every day of hold is roughly $6k in idle equipment and labor.\n\nCarlos",
    timestamp: '2026-05-14T09:34:00Z',
    inReplyTo: null
  },
  'e-016': {
    id: 'e-016',
    from: 'Dave Hartmann <d.hartmann@allianceconstruction.com>',
    to: ['pm@firm.com'],
    cc: ['safety@allianceconstruction.com', 'legal@firm.com'],
    subject: 'INCIDENT REPORT - Bay Street - fall arrest anchor failure 5/14',
    body: 'PM and team,\n\nReporting a Class B safety incident at Bay Street this morning at approximately 11:10 AM.\n\nAn ironworker (M. Castillo, ASW Steel) was working on roof joist installation at the south bay. His fall arrest lanyard anchor pulled free from a temporary clamp on a joist top chord. He fell approximately 4 feet to the joist below and was caught by his harness. He was evaluated on site, declined further medical, and has been sent home for the day per protocol.\n\nWork in the south bay is stopped pending an anchor inspection. Full report and photos to follow.\n\nDave',
    timestamp: '2026-05-14T12:05:00Z',
    inReplyTo: null
  },
  'e-001': {
    id: 'e-001',
    from: 'Sara Chen <s.chen@meridianarch.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'RFI-187: Lobby east wall finish at Riverside Tower',
    body: "Hi,\n\nLooking at the lobby east wall on A-201, the spec calls for honed limestone but the elevation shows a fluted pattern that isn't typical of honed stone. Can you confirm the intended finish, or should we go with custom fluted GFRC as an alternate? Owner had asked about budget options at the last meeting.\n\nNeed to lock this down so we can release the long-lead order. Trying to keep the curtainwall package on schedule.\n\nThanks,\nSara",
    timestamp: '2026-05-13T14:30:00Z',
    inReplyTo: null
  },
  'e-003': {
    id: 'e-003',
    from: 'Kevin Walsh <quotes@steelworks-supply.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'Bay Street - Misc Steel Package Pricing',
    body: "Per your request, attached is our updated pricing for the misc steel package at Bay Street. Pricing held through 6/15/2026. Lead time on heavy structural shapes is currently 9-11 weeks. Please confirm if you'd like to proceed with the order so we can secure shop slots.\n\nKevin Walsh\nSteelworks Supply",
    timestamp: '2026-05-13T15:12:00Z',
    inReplyTo: null
  },
  'e-005': {
    id: 'e-005',
    from: 'Diana Lo <d.lo@northpoint-mep.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'RFI-118: Bay Street - Transformer pad location',
    body: "Hi,\n\nThe electrical site plan E-101 shows the transformer pad at the NE corner, but the civil grading plan puts a storm inlet within 3' of that location. Can you confirm the pad location, or should we coordinate a shift to clear the inlet? Need this to release the pad rebar.\n\nThanks,\nDiana",
    timestamp: '2026-05-13T16:20:00Z',
    inReplyTo: null
  },
  'e-002': {
    id: 'e-002',
    from: 'Marcus Hill <m.hill@bridgewaybuild.com>',
    to: ['pm@firm.com'],
    cc: ['megan@bridgewaybuild.com'],
    subject: 'Bay Street Industrial - Daily Report 5/13',
    body: 'Crews on site: 14 (concrete, MEP rough-in, site).\nWeather: clear, 68F.\n\nWork completed:\n- SOG pour Bays 4-5 completed 11:30, ~120 CY, no rejected loads. Cured under blankets.\n- Underground electrical conduit NE quadrant ~60% complete.\n- Site grading south parking continuing.\n\nIssues: none.\nLook-ahead: Bay 6 SOG pour Friday weather permitting.\n\nMarcus',
    timestamp: '2026-05-13T17:45:00Z',
    inReplyTo: null
  },
  'e-006': {
    id: 'e-006',
    from: 'Marcus Hill <m.hill@bridgewaybuild.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject: 'Westfield K-12 - 2-week look-ahead',
    body: "Attached is the updated 2-week look-ahead for Westfield K-12. Interior framing wraps next Tuesday, MEP rough-in starts in the gym wing Wednesday. No schedule slips this cycle. Flagging that the roofing sub is one crew short but says they'll recover by month end.\n\nMarcus",
    timestamp: '2026-05-14T08:15:00Z',
    inReplyTo: null
  },
  'e-004': {
    id: 'e-004',
    from: 'SubmittalExchange <notifications@submittalexchange.com>',
    to: ['pm@firm.com'],
    cc: [],
    subject:
      '[Riverside Tower] New submittal posted: 033000-001 Concrete Mix Design',
    body: 'A new submittal has been posted for your review.\n\nProject: Riverside Tower\nSubmittal: 033000-001 Concrete Mix Design\nSubmitted by: Alliance Construction\nBall in court: Architect\n\nLog in to review.',
    timestamp: '2026-05-13T18:02:00Z',
    inReplyTo: null
  },
  'e-014': {
    id: 'e-014',
    from: 'Diana Lo <d.lo@northpoint-mep.com>',
    to: ['pm@firm.com'],
    cc: ['s.chen@meridianarch.com'],
    subject: 'RFI-241: Conflict at duct routing above Level 3 corridor',
    body: 'Hi,\n\nWe have a hard clash between the 24x12 supply duct and the sprinkler main above the Level 3 corridor at grid C-4. Both are shown at 9\'-6" AFF but the corridor ceiling is 9\'-0". We can drop the duct 8" if the structural allows, but that pinches the corridor clear height. Please advise the preferred resolution.\n\nDiana',
    timestamp: '2026-05-14T10:48:00Z',
    inReplyTo: null
  }
} satisfies Record<string, Email>;

const items: readonly InboxItem[] = [
  {
    email: emails['e-016'],
    status: 'needs_attention',
    decision: {
      emailId: 'e-016',
      category: 'safety',
      severity: 'critical',
      confidence: 0.97,
      whyPreview: 'Class B safety incident - fall arrest failure, escalate now',
      rationale:
        'This is a **Class B safety incident report** with a fall-arrest anchor failure at Bay Street. Safety incidents are always sensitive and are never auto-actioned. The worker was caught by his harness and declined further medical, but the anchor detail and south-bay stoppage need your direct attention and likely a call to the safety lead and the GC.\n\nI have drafted an acknowledgement that confirms receipt, endorses the south-bay stop-work, and requests the full report and photos — but I am holding it for your approval because of the legal cc and the liability exposure.',
      keyFacts: [
        'Class B incident, ~11:10 AM 5/14, Bay Street south bay',
        'Fall arrest lanyard anchor pulled free from temporary clamp',
        'Worker (M. Castillo, ASW Steel) caught by harness, declined medical',
        'South bay work stopped pending anchor inspection',
        "legal@firm.com is cc'd"
      ],
      isSensitive: true
    },
    pendingApproval: {
      id: 'ap-016',
      emailId: 'e-016',
      action: 'send_reply',
      summary: 'Acknowledge incident, endorse stop-work, request full report',
      payload: {
        body: "Dave,\n\nThank you for the prompt report. Confirming the south-bay stop-work stays in place until the anchor inspection is complete. Please send the full incident report and photos as soon as available, and copy me on the corrective-action plan for temporary anchor points.\n\nGlad M. Castillo is okay. I'll loop in our safety lead this afternoon.\n\n[PM]"
      },
      createdAt: '2026-05-14T12:40:00Z'
    },
    actions: []
  },
  {
    email: emails['e-010'],
    status: 'needs_attention',
    decision: {
      emailId: 'e-010',
      category: 'change_order',
      severity: 'high',
      confidence: 0.91,
      whyPreview:
        'PCO #14: unforeseen rock, ~$48.5k directive - needs your call',
      rationale:
        'Alliance hit **unforeseen rock** during south-wing footing excavation on Maplewood and needs a directive to proceed. This is a potential change order with a **~$48,500** cost impact and idle-crew burn of ~$6k/day, so it is sensitive and must not be auto-actioned.\n\nI drafted a holding reply that acknowledges receipt, asks them to keep the geotech and PE review moving, and commits to a directive by end of day — pending your approval.',
      keyFacts: [
        'PCO #14, Maplewood Senior Living south wing footings F-12–F-18',
        "Rock ~3' below planned bearing elevation, not in geotech report",
        'Option 1: mechanical removal, 4 days, est. $48,500',
        'Idle crew hold ~$6k/day'
      ],
      isSensitive: true
    },
    pendingApproval: {
      id: 'ap-010',
      emailId: 'e-010',
      action: 'send_reply',
      summary: 'Acknowledge PCO #14, commit to a directive by EOD',
      payload: {
        body: "Carlos,\n\nReceived — thanks for the options and the re-pulled geotech. Please keep the PE review moving; I'll get you a directive by end of day today. Hold the south-wing crew for now; understood on the idle-cost impact.\n\n[PM]"
      },
      createdAt: '2026-05-14T09:55:00Z'
    },
    actions: []
  },
  {
    email: emails['e-014'],
    status: 'needs_attention',
    decision: {
      emailId: 'e-014',
      category: 'rfi',
      severity: 'medium',
      confidence: 0.58,
      whyPreview:
        'RFI-241 duct/sprinkler clash - low confidence, needs design call',
      rationale:
        "RFI-241 reports a **hard clash** between a supply duct and the sprinkler main above the Level 3 corridor. The resolution trades off corridor clear height against duct routing, which is a design decision I'm not confident enough to make on my own (confidence 0.58). Flagging for your review rather than drafting a reply that could commit a ceiling-height reduction.",
      keyFacts: [
        'RFI-241, Level 3 corridor grid C-4',
        '24x12 supply duct clashes with sprinkler main at 9\'-6" AFF',
        'Corridor ceiling is 9\'-0"; dropping duct 8" pinches clear height',
        "Architect (s.chen) cc'd"
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-014-flag',
        actor: 'batch_agent',
        emailId: 'e-014',
        action: 'flag_for_review',
        summary:
          'Flagged RFI-241 for review — low confidence on design tradeoff',
        payload: {},
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-14T10:52:00Z'
      }
    ]
  },
  {
    email: emails['e-001'],
    status: 'done_for_you',
    decision: {
      emailId: 'e-001',
      category: 'rfi',
      severity: 'medium',
      confidence: 0.86,
      whyPreview:
        'RFI-187 finish clarification - drafted + sent honed-limestone reply',
      rationale:
        'RFI-187 asks whether the lobby east wall is honed limestone or a fluted alternate. The spec on A-201 is authoritative and calls out honed limestone, so I replied confirming the spec finish and noting that a fluted GFRC alternate would require an owner-approved budget option before we change the long-lead order. Routine RFI, high confidence — auto-handled.',
      keyFacts: [
        'RFI-187, Riverside Tower lobby east wall, drawing A-201',
        'Spec calls for honed limestone; elevation shows fluted pattern',
        'Long-lead order pending this answer'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-001-reply',
        actor: 'batch_agent',
        emailId: 'e-001',
        action: 'send_reply',
        summary: 'Sent RFI-187 reply — confirmed honed limestone per A-201',
        payload: {
          body: "Sara,\n\nConfirming the intended finish is honed limestone per the A-201 spec. The fluted pattern in the elevation is illustrative; if the owner wants to pursue a fluted GFRC alternate we'll need a formal budget option before releasing the long-lead order. Please proceed with honed limestone for now.\n\n[PM]"
        },
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T15:02:00Z'
      }
    ]
  },
  {
    email: emails['e-005'],
    status: 'done_for_you',
    decision: {
      emailId: 'e-005',
      category: 'rfi',
      severity: 'low',
      confidence: 0.82,
      whyPreview:
        "RFI-118 pad/inlet clash - sent reply to coordinate a 4' shift",
      rationale:
        "RFI-118 flags a transformer pad landing within 3' of a storm inlet. Coordinating a small pad shift to clear the inlet is the standard resolution and doesn't commit cost, so I replied asking NorthPoint to coordinate the shift with civil and confirm before releasing the pad rebar. Routine — auto-handled.",
      keyFacts: [
        'RFI-118, Bay Street transformer pad NE corner',
        "Storm inlet within 3' on the civil grading plan",
        'Pad rebar release pending'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-005-reply',
        actor: 'batch_agent',
        emailId: 'e-005',
        action: 'send_reply',
        summary: 'Sent RFI-118 reply — coordinate pad shift to clear inlet',
        payload: {
          body: 'Diana,\n\nPlease coordinate a pad shift with civil to clear the storm inlet by the required offset, then confirm the final location before releasing the pad rebar. Flag me if the shift affects the feeder routing.\n\n[PM]'
        },
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T16:44:00Z'
      }
    ]
  },
  {
    email: emails['e-003'],
    status: 'done_for_you',
    decision: {
      emailId: 'e-003',
      category: 'vendor_quote',
      severity: 'low',
      confidence: 0.79,
      whyPreview: 'Misc steel quote - acknowledged, held for buyout, no commit',
      rationale:
        "Steelworks sent updated misc-steel pricing held through 6/15 with a 9–11 week lead time. I acknowledged receipt and said we'll confirm during buyout — deliberately **not** committing to proceed, since placing the order is a cost commitment. Routine acknowledgement — auto-handled.",
      keyFacts: [
        'Bay Street misc steel package pricing',
        'Pricing held through 6/15/2026',
        'Lead time 9–11 weeks on heavy structural shapes'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-003-reply',
        actor: 'batch_agent',
        emailId: 'e-003',
        action: 'send_reply',
        summary: 'Sent Steelworks ack — will confirm order at buyout',
        payload: {
          body: "Kevin,\n\nThanks for the updated pricing — noted the hold through 6/15 and the 9–11 week lead time. We'll confirm the order during buyout and get back to you well ahead of the price-hold date.\n\n[PM]"
        },
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T15:40:00Z'
      }
    ]
  },
  {
    email: emails['e-002'],
    status: 'filed',
    decision: {
      emailId: 'e-002',
      category: 'daily_report',
      severity: 'low',
      confidence: 0.95,
      whyPreview: 'Bay Street daily 5/13 - no issues, filed to project log',
      rationale:
        'Routine daily report for Bay Street with no issues flagged. Filed to the project log; nothing requires a response.',
      keyFacts: [
        'Bay Street daily 5/13, 14 crew, clear/68F',
        'SOG pour Bays 4-5 done, no rejected loads',
        'No issues reported'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-002-archive',
        actor: 'batch_agent',
        emailId: 'e-002',
        action: 'archive',
        summary: 'Filed Bay Street daily 5/13 to the project log',
        payload: {},
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T17:50:00Z'
      }
    ]
  },
  {
    email: emails['e-006'],
    status: 'filed',
    decision: {
      emailId: 'e-006',
      category: 'schedule',
      severity: 'low',
      confidence: 0.9,
      whyPreview:
        'Westfield look-ahead - no slips, filed; roofing crew note only',
      rationale:
        'Two-week look-ahead for Westfield with no schedule slips. Filed to the project record. The one-crew-short roofing note is informational and the sub expects to recover by month end, so no action needed.',
      keyFacts: [
        'Westfield K-12 2-week look-ahead',
        'Interior framing wraps Tuesday, MEP rough-in starts Wednesday',
        'Roofing sub one crew short, recovering by month end'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-006-archive',
        actor: 'batch_agent',
        emailId: 'e-006',
        action: 'archive',
        summary: 'Filed Westfield look-ahead to the project record',
        payload: {},
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-14T08:20:00Z'
      }
    ]
  },
  {
    email: emails['e-004'],
    status: 'filed',
    decision: {
      emailId: 'e-004',
      category: 'submittal',
      severity: 'low',
      confidence: 0.88,
      whyPreview: "Submittal notification - ball in architect's court, filed",
      rationale:
        'Automated notification that a concrete mix-design submittal was posted with the architect holding ball-in-court. No PM action is required until the architect responds, so I filed the notification.',
      keyFacts: [
        'Riverside Tower submittal 033000-001 Concrete Mix Design',
        'Submitted by Alliance Construction',
        'Ball in court: Architect'
      ],
      isSensitive: false
    },
    pendingApproval: null,
    actions: [
      {
        id: 'le-004-archive',
        actor: 'batch_agent',
        emailId: 'e-004',
        action: 'archive',
        summary: 'Filed submittal notification 033000-001',
        payload: {},
        undoneBy: null,
        undoes: null,
        createdAt: '2026-05-13T18:05:00Z'
      }
    ]
  }
];

/** Recompute the roll-up counts from the current item list. */
function summarize(list: readonly InboxItem[]): InboxSummary {
  return {
    processed: list.filter((item) => item.decision !== null).length,
    handled: list.filter((item) => item.status === 'done_for_you').length,
    needsAttention: list.filter((item) => item.status === 'needs_attention')
      .length,
    filed: list.filter((item) => item.status === 'filed').length
  };
}

/** Build a fresh mocked inbox payload for the mock client to own and mutate. */
export function buildMockInbox(): Inbox {
  return {
    summary: summarize(items),
    items: items.map((item) => ({ ...item }))
  };
}

export { summarize as summarizeInbox };
