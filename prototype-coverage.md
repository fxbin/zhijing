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
| `#detail` | `DetailView` | `kb_detail`, `kb_deep_dive_1`, `kb_deep_dive_2` | Partial | Knowledge base overview, cards, Q&A, recent material exist; deep-dive variants are not fully represented. |
| `#library` | `LibraryView` | `library`, `instant_capture_inbox` | Partial | Capture, parsing, review, assignment, file import exist; import lifecycle states need dedicated UI. |
| `#search` | `SearchView` | `search`, `semantic_discovery` | Partial | Search exists with local semantic recall v0; semantic discovery layout and saved discovery flows are missing. |
| `#kits` | `KitView` | `kit_1`, `kit_2`, `kit_3` | Partial | Kit cards and run entry exist; collection/progress variants are incomplete. |
| `#workflow` | `WorkflowView` | `workflow_run`, `kit_collection_in_progress` | Partial | Basic run/result view exists; progress and multi-step states need Stitch-aligned treatment. |
| `#artifact` | `ArtifactView` | `artifact`, `deep_research_artifact`, `product_research_artifact`, `topic_library_artifact`, `xiaohongshu_operation_artifact` | Partial | Generic artifact viewer exists; artifact type variants are not fully implemented. |
| `#maps` | `MapsView` | `full_map`, `interaction_specs` | Partial | Knowledge map exists; interaction/connection states are incomplete. |
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
| `instant_capture_inbox` | Fast capture inbox | Partial | Add dedicated inbox queue state and pending import rows. |
| `search` | Global search | Partial | Keep route and improve result hierarchy. |
| `semantic_discovery` | Semantic discovery | Partial | Add discovery suggestions and related-cluster sections. |
| `settings` | Settings | Partial | Expand beyond model settings into source, storage, and transparency settings. |

### P1: Import And Collection Lifecycle

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `interaction_connecting` | Source connection / parsing state | Missing | Add parser lifecycle panel for connecting, parsing, blocked, retry, and manual review. |
| `batch_connection_mode` | Batch import mode | Missing | Add batch URL/text import state in Library. |
| `collection_summary` | Import result summary | Missing | Show summary after batch or parser completion. |
| `re_authorize_source` | Source re-auth / permission recovery | Missing | Add compliant user-action state for auth/permission failures. |
| `data_hygiene` | Data cleanup and health | Missing | Add duplicate/empty/failed material cleanup panel. |
| `system_transparency` | System state and process visibility | Partial | Show parser/provider status and recent task evidence in Settings. |

### P1: Chat, Recall, And Learning Loop

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `chat_onboarding` | First chat entry | Missing | Add chat intro state connected to a selected knowledge base. |
| `active_chat_1` | Active Q&A conversation | Partial | Current Q&A exists inside detail; needs full chat layout. |
| `active_chat_2` | Active conversation variant | Missing | Map variant to empty/loading/source-expanded state. |
| `active_chat_3` | Active conversation variant | Missing | Map variant to citation-expanded or follow-up state. |
| `back_loop_to_chat` | Return from artifact/workflow to chat | Missing | Add navigation affordance from artifact back to related conversation. |
| `active_recall` | Recall practice | Missing | Add card-based self-test mode after stable card schema. |
| `card_evolution` | Card improvement lifecycle | Missing | Add card revision/evolution state after review workflow. |

### P1: Kits, Workflow, And Artifacts

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `kit_1` | Kit entry state | Partial | Current Kit cards exist; align copy/layout with Stitch. |
| `kit_2` | Kit detail or variant | Partial | Add selected Kit detail state before run. |
| `kit_3` | Kit detail or variant | Partial | Add result preview / requirements state. |
| `kit_collection_in_progress` | Kit collection/progress | Missing | Add progress state for multi-source kit generation. |
| `workflow_run` | Workflow run | Partial | Add step timeline and evidence slots. |
| `artifact` | Generic artifact | Partial | Current artifact viewer exists; refine layout and export actions. |
| `deep_research_artifact` | Deep research output | Missing | Add artifact type template. |
| `product_research_artifact` | Product research output | Missing | Add artifact type template. |
| `topic_library_artifact` | Topic library output | Missing | Add artifact type template. |
| `xiaohongshu_operation_artifact` | Xiaohongshu operations output | Missing | Add artifact type template. |

### P2: Export And Backup

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `export_management` | Export center | Missing | Add export center route or settings section. |
| `export_configuration` | Export options | Missing | Add format/scope configuration. |
| `export_progress` | Export progress | Missing | Add progress state after export task exists. |
| `export_success` | Export success | Missing | Add success/download state. |
| `export_complete_auto_close` | Auto-close state | Missing | Add only if export modal pattern is chosen. |
| `export_backup` | Backup flow | Missing | Add local backup action after storage policy is finalized. |

### P2: Advanced Knowledge Operations

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `cross_kb_synthesis` | Cross-knowledge-base synthesis | Missing | Add after global search and artifact templates stabilize. |
| `multi_entity_comparison_view_1` | Entity comparison | Missing | Add comparison artifact template. |
| `multi_entity_comparison_view_2` | Entity comparison variant | Missing | Decide if this is an expanded state. |
| `global_knowledge_assets_dashboard_1` | Global asset dashboard | Missing | Add after material/card analytics exist. |
| `global_knowledge_assets_dashboard_2` | Global asset dashboard variant | Missing | Decide if it replaces or complements Search. |
| `knowledge_conflict_resolver_1` | Conflict resolution | Missing | Add duplicate/conflict detection first. |
| `knowledge_conflict_resolver_2` | Conflict resolution variant | Missing | Map to resolution review state. |
| `decomposition` | Decompose topic/material | Missing | Add as a Kit or card operation. |
| `full_map` | Full knowledge map | Partial | Current map exists; add expanded graph controls and relationship editing. |
| `interaction_specs` | Interaction and connection reference | Reference | Use when refining graph interactions. |

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

1. Import and collection lifecycle:
   `interaction_connecting`, `batch_connection_mode`, `collection_summary`, `re_authorize_source`, `data_hygiene`.
2. Chat and recall:
   `chat_onboarding`, `active_chat_1`, `active_chat_2`, `active_chat_3`, `back_loop_to_chat`, `active_recall`.
3. Export:
   `export_management`, `export_configuration`, `export_progress`, `export_success`, `export_backup`.
4. Artifact variants:
   `deep_research_artifact`, `product_research_artifact`, `topic_library_artifact`, `xiaohongshu_operation_artifact`.
5. Advanced knowledge operations:
   `cross_kb_synthesis`, `multi_entity_comparison_view_*`, `knowledge_conflict_resolver_*`, `global_knowledge_assets_dashboard_*`.

## Immediate Next Slice

Implement the import and collection lifecycle screens first, because they directly support the current product promise:

- Save links and local text/documents.
- Parse or manually complete source material.
- Show what happened and what needs user action.
- Keep platform failures recoverable instead of blocking the knowledge-base flow.
