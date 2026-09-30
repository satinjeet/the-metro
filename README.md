# the-metro

Infrastructure as **JSX**. Describe a container deployment across one or more
SSH-reachable Linux hosts as a component tree; a single CLI renders it,
connects, and runs it — podman or docker, no server, no state file. Think
"Pulumi/Terraform, but the DSL is JSX and the only targets are SSH-reachable
Linux boxes."

```tsx
export default (
  <Deployment tags="prod, web" runtime={new Podman()} host={appHost}
    connectVia={new SshConnection({ user: 'deploy', privateKeyPath: '~/.ssh/id_ed25519' })}>
    <Container runtime="podman" image="nginx:1.25" name="web" detach restart="always" persist>
      <Port from={8000} to={80} />
    </Container>
  </Deployment>
);
```

```sh
themetro tree configs          # what is here, and what tags exist
themetro validate configs      # does it all compile and render
themetro deploy --tag prod     # do it
```

**This repo is a binary + types mirror, not the source.** the-metro is
developed in a private repo; this one exists so the standalone binary,
its npm-published types, and worked example configs are publicly reachable
without exposing that source or the private infrastructure it was built
against.

## Install

**The CLI** — a standalone binary, no Node required:

```sh
curl -fsSL https://raw.githubusercontent.com/satinjeet/the-metro/main/install.sh | sh
```

Installs `themetro` and a `themetro-mcp` symlink. See [Releases](../../releases)
for every build target (`linux-x64`, `linux-arm64`, `linux-musl-x64`,
`linux-arm64-musl`, `darwin-arm64`) and `SHA256SUMS`.

**Types**, for your config project's editor/`tsc` — the binary above doesn't
need this, it's for authoring `.tsx` configs with autocomplete:

```sh
npm install -D @the-metro/cli
```

## Sample configs

[`sample-configs/`](sample-configs) — the DSL's full component reference
(`full-example-podman.tsx`, `full-example-docker.tsx`) plus
[`sample-configs/real-world/`](sample-configs/real-world): configs adapted
from real production deployments (genericized — no real hostnames, domains,
or credentials), showing multi-host setups, vault-backed secrets, shared
podman networks, and privileged-port redirects. That directory ships its own
demo vault and validates standalone:

```sh
cd sample-configs/real-world && themetro validate .   # the vault path resolves from the current directory
```

## Learn more

Full documentation lives on this project's wiki (component reference, CLI
commands, the MCP server, the secrets vault, migration notes) — see the
**Wiki** tab above.

## License

MIT — see [LICENSE](LICENSE).
