# Gemini CLI: Token-Efficient Workspace
# Tech: ArcGIS Pro SDK, FastAPI, SQL Server, React

## Critical Commands
- Build Addin: `dotnet build addin/ArcLayoutSentinel.csproj`
- Run Backend: `uvicorn backend.src.main:app --reload`
- Dev Frontend: `npm run dev --prefix frontend`

## Response Guidelines (Token Saver)
- **Be terse.** No fluff, no "Sure", no apologies.
- Skip explanations for trivial changes.
- Provide code immediately if fix is obvious.
- For bug fixes: 1. Reproduce, 2. Fix, 3. Verify.
- Use `grep` or `find` before reading files.

## Output Optimization
- Answer in <3 sentences.
- Use bullet points.
- Omit markdown language tags if obvious.

## Context Management
- **Index, don't manual.** Reference files instead of describing logic.
- Symbol-based search: Use `grep_search` for `class`, `interface`, `public void` etc.
- For batch edits (>3 files), use `invoke_agent('generalist')`.

## Implementation Strategy
- Follow [specs/001-layout-monitoring/plan.md](specs/001-layout-monitoring/plan.md).
- Status: Ready to refactor `ConnectButton`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
