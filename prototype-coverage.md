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
| `#library` | `LibraryView` | `library`, `instant_capture_inbox`, `interaction_connecting`, `batch_connection_mode`, `collection_summary`, `re_authorize_source`, `data_hygiene` | Partial | Capture, batch input, parsing summary, review recovery, assignment, file import, and hygiene signals exist; deeper automation and standalone modal states remain. |
| `#search` | `SearchView` | `search`, `semantic_discovery` | Partial | Search exists with local semantic recall v0; semantic discovery layout and saved discovery flows are missing. |
| `#assets` | `GlobalAssetsDashboard` | `global_knowledge_assets_dashboard_1`, `global_knowledge_assets_dashboard_2` | Partial | Global asset dashboard exists with aggregated materials, cards, artifacts, tasks, review and duplicate signals; persistent analytics and deeper filtering are still missing. |
| `#synthesis` | `CrossKbSynthesisView` | `cross_kb_synthesis` | Partial | Cross-knowledge-base theme overlap view exists; generated synthesis documents and Pi-backed synthesis are still missing. |
| `#compare` | `MultiEntityComparisonView` | `multi_entity_comparison_view_1`, `multi_entity_comparison_view_2` | Partial | Entity comparison exists at knowledge-base granularity; extracted entity comparison and expanded states are still missing. |
| `#conflicts` | `KnowledgeConflictResolverView` | `knowledge_conflict_resolver_1`, `knowledge_conflict_resolver_2` | Partial | Conflict review exists for duplicate, review, and unsourced-card signals; audited merge/delete actions are still missing. |
| `#kits` | `KitView` | `kit_1`, `kit_2`, `kit_3` | Partial | Kit cards and run entry exist; collection/progress variants are incomplete. |
| `#workflow` | `WorkflowView` | `workflow_run`, `kit_collection_in_progress` | Partial | Basic run/result view exists; progress and multi-step states need Stitch-aligned treatment. |
| `#artifact` | `ArtifactView` | `artifact`, `deep_research_artifact`, `product_research_artifact`, `topic_library_artifact`, `xiaohongshu_operation_artifact` | Partial | Typed artifact layouts exist for research, product, topic, Xiaohongshu, and summary views; explicit persisted subtype and editing remain missing. |
| `#maps` | `MapsView` | `full_map`, `interaction_specs` | Partial | Full Knowledge Map workbench exists with search, filters, zoom, SVG graph, node inspector, relation list, and legend; persisted layout and relationship editing are still missing. |
| `#chat` | `ChatView` | `chat_onboarding`, `active_chat_1`, `active_chat_2`, `active_chat_3`, `back_loop_to_chat` | Partial | Dedicated knowledge-base chat route exists; persistent conversation states and source-expanded variants are still missing. |
| `#recall` | `RecallView` | `active_recall`, `card_evolution` | Partial | Card-based reveal/next recall flow exists; scheduling, scoring, and card evolution are still missing. |
| `#export` | `ExportView` | `export_management`, `export_configuration`, `export_progress`, `export_success`, `export_backup` | Partial | Local Markdown/JSON export, progress, success, and backup download exist; persistent history, PDF, and cloud backup are still missing. |
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
| `data_hygiene` | Data cleanup and health | Partial | Library now shows duplicate/review/failure signals; automatic merge/cleanup actions are still missing. |
| `system_transparency` | System state and process visibility | Partial | Show parser/provider status and recent task evidence in Settings. |

### P1: Chat, Recall, And Learning Loop

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `chat_onboarding` | First chat entry | Partial | `#chat` now has contextual onboarding and suggested prompts; first-run empty state can be refined. |
| `active_chat_1` | Active Q&A conversation | Partial | `#chat` now reuses the knowledge-base Q&A flow with citations. |
| `active_chat_2` | Active conversation variant | Partial | Loading and answer states exist; source-expanded variant is still missing. |
| `active_chat_3` | Active conversation variant | Partial | Citation list exists; follow-up/thread persistence is still missing. |
| `back_loop_to_chat` | Return from artifact/workflow to chat | Partial | Chat can open artifacts; artifact-to-chat return context is still missing. |
| `active_recall` | Recall practice | Partial | `#recall` now provides card queue, reveal answer, and next-card flow. |
| `card_evolution` | Card improvement lifecycle | Missing | Add card revision/evolution state after review workflow. |

### P1: Kits, Workflow, And Artifacts

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `kit_1` | Kit entry state | Partial | Current Kit cards exist; align copy/layout with Stitch. |
| `kit_2` | Kit detail or variant | Partial | Add selected Kit detail state before run. |
| `kit_3` | Kit detail or variant | Partial | Add result preview / requirements state. |
| `kit_collection_in_progress` | Kit collection/progress | Missing | Add progress state for multi-source kit generation. |
| `workflow_run` | Workflow run | Partial | Add step timeline and evidence slots. |
| `artifact` | Generic artifact | Partial | Artifact viewer now has metrics, sections, source boundary, and action rail. |
| `deep_research_artifact` | Deep research output | Partial | Deep research template is inferred in UI; persisted subtype and bespoke generation are missing. |
| `product_research_artifact` | Product research output | Partial | Product research template is inferred in UI; product-specific generation schema is missing. |
| `topic_library_artifact` | Topic library output | Partial | Topic library template is inferred in UI; queue management is missing. |
| `xiaohongshu_operation_artifact` | Xiaohongshu operations output | Partial | Xiaohongshu operations template is inferred in UI; platform-specific risk workflow is missing. |

### P2: Export And Backup

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `export_management` | Export center | Partial | `#export` now provides local export center; persisted export history is still missing. |
| `export_configuration` | Export options | Partial | Markdown/JSON, scope, and artifact inclusion are configurable; PDF and advanced options are missing. |
| `export_progress` | Export progress | Partial | Local progress state exists; server task progress is deferred until backend export exists. |
| `export_success` | Export success | Partial | Success state and download action exist; auto-close/modal variant is not implemented. |
| `export_complete_auto_close` | Auto-close state | Missing | Add only if export modal pattern is chosen. |
| `export_backup` | Backup flow | Partial | Local JSON backup download exists; scheduled/cloud backup is missing. |

### P2: Advanced Knowledge Operations

| Stitch reference | Product intent | Current status | Next implementation action |
| --- | --- | --- | --- |
| `cross_kb_synthesis` | Cross-knowledge-base synthesis | Partial | `#synthesis` now shows cross-KB theme overlap and suggested synthesis structure; generated reports are deferred. |
| `multi_entity_comparison_view_1` | Entity comparison | Partial | `#compare` now compares knowledge-base entities by assets and source health. |
| `multi_entity_comparison_view_2` | Entity comparison variant | Partial | Expanded variant is represented by the same comparison board; entity extraction is still deferred. |
| `global_knowledge_assets_dashboard_1` | Global asset dashboard | Partial | `#assets` now aggregates global asset counts and recent asset lists. |
| `global_knowledge_assets_dashboard_2` | Global asset dashboard variant | Partial | Dashboard variant is represented through review/duplicate signal metrics; saved filters are still missing. |
| `knowledge_conflict_resolver_1` | Conflict resolution | Partial | `#conflicts` now shows duplicate, review, and unsourced-card signals with review entry points. |
| `knowledge_conflict_resolver_2` | Conflict resolution variant | Partial | Resolver variant is represented as read-only action cards; audited resolution mutations are deferred. |
| `decomposition` | Decompose topic/material | Missing | Add as a Kit or card operation. |
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
   detailed parser timeline, batch action side panel, and post-task success state.
2. Finish chat and recall:
   persistent conversation, source-expanded chat states, artifact back-link context, recall scoring, and card evolution.
3. Finish export:
   persisted export history, PDF output, and optional modal/auto-close behavior.
4. Finish artifact variants:
   persisted artifact subtype, editable sections, and type-specific generation schemas.
5. Continue advanced knowledge operations:
   persist filters, add entity extraction, Pi-backed synthesis generation, and audited conflict resolution.

## Immediate Next Slice

Run a visual pass on `#maps`, then continue with remaining P0/P1 polish gaps.
