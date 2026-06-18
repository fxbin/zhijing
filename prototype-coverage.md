# Prototype Coverage

This file tracks how the Stitch prototype set maps to the actual app implementation.

`stitch_/` is a design reference only. Production code must copy or adapt useful structure into `apps/web` and must not reference `stitch_/` at runtime.

## Status Legend

- `Done`: The screen or state is represented by an accessible app route or component.
- `Partial`: The main idea exists, but important visual states, interactions, or variants are missing.
- `Missing`: Not implemented in the app yet.
- `Reference`: Brand, animation, or exploratory material; not necessarily a product screen.

## Current App Routes

| App route | Current component | Stitch baseline | Status | Notes |
| --- | --- | --- | --- | --- |
| `#workspace` | `WorkspaceView` | `workspace`, `professional_workbench` | Partial | Main command and workspace shell exist; still missing richer discovery hub states. |
| `#detail` | `DetailView` | `kb_detail`, `kb_deep_dive_1`, `kb_deep_dive_2` | Done | Knowledge base overview, cards, Q&A, recent material, and entity extraction panel exist. |
| `#library` | `LibraryView` | `library`, `instant_capture_inbox`, `interaction_connecting`, `batch_connection_mode`, `collection_summary`, `re_authorize_source`, `data_hygiene` | Partial | Capture, batch input, parsing summary, review recovery, assignment, file import, and hygiene signals exist; deeper automation and standalone modal states remain. |
| `#search` | `SearchView` | `search`, `semantic_discovery` | Partial | Search exists with local semantic recall v0; semantic discovery layout and saved discovery flows are missing. |
| `#assets` | `GlobalAssetsDashboard` | `global_knowledge_assets_dashboard_1`, `global_knowledge_assets_dashboard_2` | Done | Global asset dashboard with aggregated materials, cards, artifacts, tasks, review signals, and persistent filters. |
| `#synthesis` | `CrossKbSynthesisView` | `cross_kb_synthesis` | Done | Cross-knowledge-base theme overlap view with Pi-backed synthesis generation and persisted artifact. |
| `#compare` | `MultiEntityComparisonView` | `multi_entity_comparison_view_1`, `multi_entity_comparison_view_2` | Partial | Entity comparison exists at knowledge-base granularity; extracted entity comparison and expanded states are still missing. |
| `#conflicts` | `KnowledgeConflictResolverView` | `knowledge_conflict_resolver_1`, `knowledge_conflict_resolver_2` | Done | Conflict resolver with audited merge/delete actions and audit trail panel. |
| `#kits` | `KitView` | `kit_1`, `kit_2`, `kit_3` | Partial | Kit cards and run entry exist; collection/progress variants are incomplete; topic decomposition kit added. |
| `#workflow` | `WorkflowView` | `workflow_run`, `kit_collection_in_progress` | Partial | Basic run/result view exists; progress and multi-step states need Stitch-aligned treatment. |
| `#artifact` | `ArtifactView` | `artifact`, `deep_research_artifact`, `product_research_artifact`, `topic_library_artifact`, `xiaohongshu_operation_artifact` | Done | Typed artifact layouts with persisted subtype, editable sections, and revision history. |
| `#maps` | `MapsView` | `full_map`, `interaction_specs` | Partial | Full Knowledge Map workbench exists with search, filters, zoom, SVG graph, node inspector, relation list, and legend; persisted layout and relationship editing are still missing. |
| `#chat` | `ChatView` | `chat_onboarding`, `active_chat_1`, `active_chat_2`, `active_chat_3`, `back_loop_to_chat` | Done | Dedicated knowledge-base chat with persistent conversation history and source citations. |
| `#recall` | `RecallView` | `active_recall`, `card_evolution` | Done | Card-based recall with SM-2-lite scheduling, scoring, and card revision history. |
| `#export` | `ExportView` | `export_management`, `export_configuration`, `export_progress`, `export_success`, `export_backup` | Done | Local Markdown/JSON/PDF export, persistent history, auto-close modal, and local backup. |
| `#settings` | `SettingsView` | `settings`, `system_transparency` | Partial | Provider settings exist; transparency, source auth, and data controls are incomplete. |

## Coverage By Product Area

### P0: Core Shell And MVP Flow

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `workspace` | Main workbench and command entry | Partial | Align top-level layout density and empty/loading states with Stitch. |
| `professional_workbench` | More capable workspace shell | Partial | Merge useful workbench panels into `WorkspaceView` without adding a marketing surface. |
| `knowledge_path_logo` | Brand mark reference | Done | Brand mark is implemented in the side nav; keep this as visual reference. |
| `create_kb_modal` | Create knowledge base modal | Missing | Add modal route/state for explicit knowledge base creation instead of relying only on text input. |
| `kb_detail` | Knowledge base detail | Partial | Improve card/material grouping and source indicators to match Stitch. |
| `kb_deep_dive_1` | Deep knowledge base exploration | Missing | Add deeper card/material analysis panel. |
| `kb_deep_dive_2` | Deep knowledge base exploration variant | Missing | Decide whether this is a responsive/alternate state or separate mode. |
| `library` | Material repository | Partial | Keep current functional library and refine visual density against Stitch. |
| `instant_capture_inbox` | Fast capture inbox | Partial | Inbox exists with batch/file capture; pending queue rows still need stronger visual treatment. |
| `search` | Global search | Partial | Keep route and improve result hierarchy. |
| `semantic_discovery` | Semantic discovery | Partial | Add discovery suggestions and related-cluster sections. |
| `settings` | Settings | Partial | Expand beyond model settings into source, storage, and transparency settings. |

### P1: Import And Collection Lifecycle

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `interaction_connecting` | Source connection / parsing state | Partial | Library now has lifecycle steps for captured, queued, review, and ingested states; detailed per-source parser timeline is still missing. |
| `batch_connection_mode` | Batch import mode | Partial | Library now supports one-source-per-line batch capture; batch action side panel is still missing. |
| `collection_summary` | Import result summary | Partial | Library now shows collection metrics and recent captures; post-task success splash is still missing. |
| `re_authorize_source` | Source re-auth / permission recovery | Partial | Library now exposes recoverable review items; full authorization modal is deferred until source auth exists. |
| `data_hygiene` | Data cleanup and health | Done | Automatic merge/cleanup with audited conflict resolution is now implemented. |
| `system_transparency` | System state and process visibility | Partial | Show parser/provider status and recent task evidence in Settings. |

### P1: Chat, Recall, And Learning Loop

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `chat_onboarding` | First chat entry | Partial | `#chat` now has contextual onboarding and suggested prompts; first-run empty state can be refined. |
| `active_chat_1` | Active Q&A conversation | Partial | `#chat` now reuses the knowledge-base Q&A flow with citations. |
| `active_chat_2` | Active conversation variant | Done | Loading, answer, and source-expanded citation states are implemented. |
| `active_chat_3` | Active conversation variant | Done | Citation list and persistent thread history are implemented. |
| `back_loop_to_chat` | Return from artifact/workflow to chat | Done | Artifact-to-chat return context is implemented. |
| `active_recall` | Recall practice | Partial | `#recall` now provides card queue, reveal answer, and next-card flow. |
| `card_evolution` | Card improvement lifecycle | Done | Card revision/evolution state with diff vs prior is implemented. |

### P1: Kits, Workflow, And Artifacts

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `kit_1` | Kit entry state | Partial | Current Kit cards exist; align copy/layout with Stitch. |
| `kit_2` | Kit detail or variant | Partial | Add selected Kit detail state before run. |
| `kit_3` | Kit detail or variant | Partial | Add result preview / requirements state. |
| `kit_collection_in_progress` | Kit collection/progress | Missing | Add progress state for multi-source kit generation. |
| `workflow_run` | Workflow run | Partial | Add step timeline and evidence slots. |
| `artifact` | Generic artifact | Partial | Artifact viewer now has metrics, sections, source boundary, and action rail. |
| `deep_research_artifact` | Deep research output | Done | Persisted subtype and editable sections are implemented. |
| `product_research_artifact` | Product research output | Done | Persisted subtype and editable sections are implemented. |
| `topic_library_artifact` | Topic library output | Done | Persisted subtype and editable sections are implemented. |
| `xiaohongshu_operation_artifact` | Xiaohongshu operations output | Done | Persisted subtype and editable sections are implemented. |

### P2: Export And Backup

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `export_management` | Export center | Done | Persisted export history is implemented. |
| `export_configuration` | Export options | Done | Markdown/JSON/PDF, scope, and artifact inclusion are configurable. |
| `export_progress` | Export progress | Partial | Local progress state exists; server task progress is deferred until backend export exists. |
| `export_success` | Export success | Partial | Success state and download action exist; auto-close/modal variant is not implemented. |
| `export_complete_auto_close` | Auto-close state | Done | Auto-close modal variant is implemented. |
| `export_backup` | Backup flow | Partial | Local JSON backup exists; cloud backup stub recorded as local-first decision. |

### P2: Advanced Knowledge Operations

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `cross_kb_synthesis` | Cross-knowledge-base synthesis | Done | Pi-backed synthesis generation with persisted artifact is implemented. |
| `multi_entity_comparison_view_1` | Entity comparison | Partial | `#compare` now compares knowledge-base entities by assets and source health. |
| `multi_entity_comparison_view_2` | Entity comparison variant | Done | Entity extraction is implemented; comparison can use extracted entities. |
| `global_knowledge_assets_dashboard_1` | Global asset dashboard | Partial | `#assets` now aggregates global asset counts and recent asset lists. |
| `global_knowledge_assets_dashboard_2` | Global asset dashboard variant | Done | Saved filters with persistent scope are implemented. |
| `knowledge_conflict_resolver_1` | Conflict resolution | Done | Conflict signals with interactive merge and audit trail are implemented. |
| `knowledge_conflict_resolver_2` | Conflict resolution variant | Done | Audited resolution mutations are implemented. |
| `decomposition` | Decompose topic/material | Done | Topic decomposition Kit operation is implemented. |
| `full_map` | Full knowledge map | Done | `#maps` now implements the full-map workbench with graph controls, selected-node detail, relation list, filters, search, and legend. |
| `interaction_specs` | Interaction and connection reference | Partial | Map search, filter, select, zoom, and inspect states exist; drag layout, saved positions, and relationship editing remain deferred. |

### P3: Sharing, Templates, Discovery, And Motion

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `discovery_hub` | Discovery surface | Missing | Add only after search/discovery strategy is confirmed. |
| `insights` | Insights page | Partial | Current `#artifact` and top nav label overlap; decide whether Insights becomes artifact hub. |
| `kb_template_sharing_config_1` | Template sharing config | Missing | Defer until sharing is in scope. |
| `kb_template_sharing_config_2` | Template sharing config variant | Missing | Defer until sharing is in scope. |
| `animated` | Motion reference | Reference | Use for micro-interactions only. |
| `integration_animation_1` | Integration animation | Reference | Use only if source connection screens need motion. |
| `integration_animation_2` | Integration animation variant | Reference | Use only if source connection screens need motion. |
| `re_layout` | Layout experiment | Reference | Compare before major layout changes. |
| `three.js` | 3D experiment | Reference | Not part of current product scope. |

### Unclassified Numbered Screens

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `_1` to `_15` | Early or unlabeled prototype variants | Reference | Review visually before each implementation batch; promote only if they map to a product flow. |

## Recommended Implementation Order

1. Finish import and collection lifecycle:
   detailed parser timeline and batch action side panel.
2. Finish search and discovery:
   semantic discovery layout and saved discovery flows.
3. Continue advanced knowledge operations:
   expanded entity comparison and richer map layout editing.
4. Polish remaining P0/P1 visual gaps:
   align density and empty/loading states with Stitch references.

## Immediate Next Slice

All planned domain tasks (D1–D5) are complete. Run a final visual pass on `#maps` and `#workspace`, then evaluate next iteration priorities.
