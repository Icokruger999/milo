# Flakes Redesign Plan - Confluence-Like Experience

## Current State
- Basic rich text editor with formatting toolbar
- Image upload support (base64)
- Collapsible date sections
- Simple list view

## Goals
1. **Bigger editing area** - Full-screen or wide editor
2. **More Confluence functionality** - Advanced editing features
3. **Better organization** - Tree structure, breadcrumbs, spaces
4. **Enhanced collaboration** - Comments, mentions, versions

---

## Phase 1: Bigger Editor & Layout Improvements

### 1.1 Full-Width Editor
- Remove max-width constraint (currently 900px)
- Use full browser width with proper margins
- Two-column layout option: TOC on left, content on right

### 1.2 Distraction-Free Mode
- Full-screen editing mode (F11 or button)
- Hide sidebar and navigation
- Focus on content only
- ESC to exit

### 1.3 Split View
- Side-by-side: Editor | Preview
- Toggle between Edit/Preview/Both
- Live preview as you type

---

## Phase 2: Confluence-Like Features

### 2.1 Rich Content Blocks
- **Tables** - Insert/edit tables with toolbar
- **Code blocks** - Syntax highlighting for multiple languages
- **Callouts/Info boxes** - Info, Warning, Success, Error panels
- **Expandable sections** - Collapsible content blocks
- **Columns** - 2-column or 3-column layouts
- **Quotes** - Blockquote styling
- **Horizontal rules** - Visual separators

### 2.2 Advanced Formatting
- **Text color** - Color picker for text
- **Background color** - Highlight text
- **Font size** - Heading levels + custom sizes
- **Alignment** - Left, center, right, justify
- **Indentation** - Increase/decrease indent
- **Lists** - Nested bullets, numbered, checklists
- **Emojis** - Emoji picker 😊

### 2.3 Media & Embeds
- **Image gallery** - Multiple images in grid
- **Video embeds** - YouTube, Vimeo links
- **File attachments** - PDF, docs (stored as base64 or S3)
- **Diagrams** - Mermaid.js for flowcharts
- **Embeds** - iframes for external content

### 2.4 Macros (Confluence-style)
- **Table of Contents** - Auto-generated from headings
- **Status badges** - In Progress, Done, Draft, etc.
- **Date stamps** - Last updated, created date
- **User mentions** - @username with autocomplete
- **Page links** - Link to other flakes
- **Breadcrumbs** - Navigation path

---

## Phase 3: Organization & Structure

### 3.1 Spaces (Like Confluence)
- Group flakes into "Spaces" (e.g., Engineering, Marketing, HR)
- Each space has its own home page
- Space-level permissions (future)

### 3.2 Page Tree/Hierarchy
- Parent-child relationships between flakes
- Tree view in sidebar showing structure
- Drag & drop to reorganize
- Breadcrumb navigation

### 3.3 Templates
- Pre-built templates: Meeting Notes, Project Plan, Requirements, etc.
- Custom templates users can create
- Quick start from template

### 3.4 Labels/Tags
- Multiple labels per flake
- Filter by label
- Label colors
- Popular labels shown

---

## Phase 4: Collaboration Features

### 4.1 Comments
- Inline comments on specific text
- Comment threads
- Resolve/unresolve comments
- Notifications for mentions

### 4.2 Version History
- Track all changes to a flake
- View previous versions
- Compare versions (diff view)
- Restore old version

### 4.3 Mentions & Notifications
- @mention users in content or comments
- Email notifications for mentions
- Activity feed showing recent changes

### 4.4 Sharing & Permissions
- Share link to flake
- Public/private toggle
- View-only vs edit permissions
- Share with specific users

---

## Phase 5: Search & Discovery

### 5.1 Advanced Search
- Full-text search across all flakes
- Filter by space, label, author, date
- Search within specific flake
- Recent searches

### 5.2 Related Content
- "Related flakes" suggestions
- "Recently viewed" list
- "Popular flakes" based on views

---

## Implementation Priority

### Must Have (Phase 1)
1. ✅ Full-width editor layout
2. ✅ Distraction-free mode
3. ✅ Split view (Edit/Preview)
4. ✅ Tables support
5. ✅ Code blocks with syntax highlighting
6. ✅ Callout/info boxes
7. ✅ Table of contents macro

### Should Have (Phase 2)
8. Expandable sections
9. Text/background colors
10. Emoji picker
11. Status badges
12. Page tree/hierarchy
13. Templates

### Nice to Have (Phase 3)
14. Comments system
15. Version history
16. Spaces
17. Advanced search
18. Mentions

---

## Technical Considerations

### Editor Library Options
1. **Quill.js** - Rich text editor with modules
2. **TipTap** - Modern, extensible, Vue/React compatible
3. **ProseMirror** - Low-level, highly customizable
4. **EditorJS** - Block-based editor (like Notion)
5. **Keep current** - Enhance existing textarea with more features

**Recommendation**: Start with current editor, add features incrementally. Consider TipTap or EditorJS for major rewrite.

### Storage
- Continue using base64 for images (simple, no S3 needed)
- For larger files, consider S3 integration
- Version history: Store diffs or full snapshots

### Database Changes
- Add `parentFlakeId` for hierarchy
- Add `spaceId` for spaces
- Add `labels` JSON array
- Add `template` boolean flag
- Add `versions` table for history

---

## UI Mockup (Text Description)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Flakes    [Save] [Cancel] [⋮ More]          [@] [🔔] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Title: ________________________________________________         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ B I U S | H1 H2 H3 | • 1. ☑ | 🔗 📷 📊 | 💬 | ⚙      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  # Heading                                               │   │
│  │                                                           │   │
│  │  Your content here...                                    │   │
│  │                                                           │   │
│  │  [Insert Table] [Insert Code] [Insert Callout]          │   │
│  │                                                           │   │
│  │                                                           │   │
│  │                                                           │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Labels: [+ Add label]                                          │
│  Space: [Select space ▼]                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Review this plan** - Confirm priorities and features
2. **Choose Phase 1 features** - Start with must-haves
3. **Design mockup** - Create visual design
4. **Implement incrementally** - One feature at a time
5. **Test & iterate** - Get feedback, improve

---

## Questions for You

1. **Editor size**: Do you want full-screen by default, or toggle?
2. **Most important features**: Which Confluence features do you use most?
3. **Spaces**: Do you need spaces/hierarchy now, or later?
4. **Comments**: Priority for collaboration features?
5. **Templates**: What templates would be most useful?

Let me know which features to prioritize and I'll start implementing!
