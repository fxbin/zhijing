---
name: Structured Growth
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#006d36'
  on-secondary: '#ffffff'
  secondary-container: '#6dfe9c'
  on-secondary-container: '#007439'
  tertiary: '#0b1612'
  on-tertiary: '#ffffff'
  tertiary-container: '#202b26'
  on-tertiary-container: '#86938b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Prototype Implementation Rule

知径所有前端原型和页面实现必须遵循 `stitch_/` 中的 Stitch 原型设计。

执行顺序：

1. 先查看对应的 Stitch 页面、截图和 `code.html`。
2. 如果 Stitch 页面结构、布局、样式可以直接使用，优先复制到 `apps/web` 中改造成我们的 React 组件。
3. 如果不能直接使用，也必须沿用 Stitch 的信息架构、视觉密度、布局节奏、颜色、字号、间距和交互状态。
4. 不重新设计一套与 Stitch 冲突的界面语言。
5. `stitch_/` 本身保持为参考资产，不作为运行时路径引用；可复用内容进入 `apps/web` 后才算项目代码。

当前页面映射：

```text
首页 / 工作台       -> stitch_/workspace
知识库详情         -> stitch_/kb_detail, stitch_/kb_deep_dive_1, stitch_/kb_deep_dive_2
资料库             -> stitch_/library
搜索 / 发现        -> stitch_/search, stitch_/semantic_discovery
Kit 中心           -> stitch_/kit_1, stitch_/kit_2, stitch_/kit_3
Workflow Run       -> stitch_/workflow_run
Artifact           -> stitch_/artifact, stitch_/deep_research_artifact, stitch_/product_research_artifact
设置               -> stitch_/settings
```

## Brand & Style
The brand personality is intellectual, orderly, and nurturing. It aims to evoke a sense of "calm productivity"—where the complexity of information is tamed by a structured, minimalist framework. The design system follows a **Modern Minimalist** aesthetic, prioritizing high-density information through generous whitespace and a rigorous grid.

The UI should feel like a premium stationary set: tactile yet digital, silent yet supportive. By stripping away unnecessary ornamentation, we focus the user's emotional response on clarity and the personal progress of their "Knowledge Path."

## Colors
The palette is anchored by **Scholar Blue** (#1E293B), used for primary navigation and high-level headings to establish authority and focus. **Sage Green** (#4ADE80) is used sparingly as a "growth" accent—marking completed tasks, new connections, or active states. 

The neutral palette relies on a "Crisp White" background to maximize contrast with the typography. Borders are kept extremely subtle (#E2E8F0) to define structure without adding visual noise. Success states use the Sage Green, while interactive hover states utilize a very soft version of the primary blue.

## Typography
We use **Inter** for its exceptional legibility and systematic feel. The hierarchy is strictly enforced: large display titles for "Path" names, and highly legible body text for note-taking. 

To ensure readability, line heights are generous (1.5x for body text). Labels use a slightly heavier weight and uppercase tracking to distinguish metadata from content. For mobile devices, headline sizes scale down to prevent awkward line breaks while maintaining the same weight and character.

## Layout & Spacing
The design system employs a **Fixed Grid** on desktop (1280px max-width) and a **Fluid Grid** on mobile. A strict 8px spacing system ensures all elements align predictably. 

- **Desktop:** 12-column grid, 24px gutters, 40px side margins.
- **Tablet:** 8-column grid, 16px gutters, 24px side margins.
- **Mobile:** 4-column grid, 16px gutters, 16px side margins.

Content is organized into logical "strips." Related items (like a cluster of notes) use `xs` (8px) spacing, while distinct sections use `lg` (40px) to provide visual breathing room.

## Elevation & Depth
Depth is created through **Tonal Layers** and extremely **Ambient Shadows**. We avoid heavy shadows to maintain the minimalist "flat" aesthetic.

- **Level 0 (Background):** #FAFAFA. The canvas.
- **Level 1 (Cards):** White background with a 1px border (#E2E8F0). This is the default state for knowledge nodes.
- **Level 2 (Hover/Active):** A soft shadow `0 4px 12px rgba(0,0,0,0.05)` to suggest interactivity.
- **Level 3 (Modals/Overlays):** A more pronounced shadow `0 12px 32px rgba(0,0,0,0.1)` to lift the element above the workspace.

Backdrop blurs (12px) are used behind navigation sidebars on mobile to maintain context without visual clutter.

## Shapes
In line with the "Structured Growth" theme, shapes are disciplined but approachable. We use a standard **8px (0.5rem)** radius for most UI elements like cards, input fields, and buttons. 

- **Small elements (Checkboxes):** 4px radius.
- **Medium elements (Cards/Modals):** 8px (Level 2).
- **Large containers:** 16px (Level 3) for major layout sections.

This consistency in roundedness bridges the gap between the rigid "structure" of the data and the organic "growth" of the knowledge.

## Components

### Buttons
- **Primary:** Solid Scholar Blue with white text. High contrast, 8px radius.
- **Secondary:** Ghost style. Transparent background with a 1px border of Scholar Blue.
- **Tertiary/Icon:** No background or border. Uses Scholar Blue for the icon, shifting to a light gray background on hover.

### Cards
Cards are the primary vessel for information. They feature a white background, 1px border, and 8px corners. Padding is set to `md` (24px) to ensure content never feels cramped.

### Input Fields
Clean, 1px border (#E2E8F0) with a 4px radius. On focus, the border transitions to Scholar Blue with a 2px soft glow. Labels sit above the field in `label-md` style.

### Chips & Tags
Used for categorization. They use a soft background (Sage Green at 10% opacity) with Sage Green text. This creates a "botanical" feel for organization.

### Knowledge Nodes (Special Component)
A custom list item representing a node in the path. It features a vertical "growth line" on the left, using Scholar Blue for parent nodes and Sage Green for leaf nodes (completed insights).

### Lists
Lists are clean with 1px horizontal dividers. Interactive list items utilize a subtle background color shift on hover rather than a border change.
