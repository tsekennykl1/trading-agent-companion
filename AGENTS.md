<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the public MCP endpoint at `/mcp` and place its human-readable setup guide at `/mcp-guide`, because TanStack's generated MCP route must remain dedicated to protocol traffic.
- Notify connection badge subscribers from the bridge URL setter, because same-tab localStorage writes do not dispatch storage events.
- Convert the full engine `result.html` into the detail page's report presentation, omitting its embedded chart and artifact links because the page supplies one chart and separate downloads.
- Rebuild known run artifact URLs from the configured engine base and run ID, because engine-emitted absolute URLs can omit reverse-proxy path prefixes.
- Use `https://www.myfinance5051.com/api` as the production engine and artifact base in both browser builds and server-side MCP tools.
