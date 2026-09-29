# Real-world sample configs

Adapted from real production deployments, with hostnames, domains and
credentials genericized. Unlike the other files in `sample-configs/`, these
use `__vault()` directly (`hosts.*.sshPassword`, `apps.*` secrets) the way a
real multi-host setup does, rather than `secretKey`/`privateKeyPath`.

A demo vault ships alongside (`.metro/vault.yaml`), so these validate,
render, and tree out of the box:

```sh
themetro validate .
themetro tree .
METRO_VAULT_PASSWORD=sample-only themetro manifest .   # see resolved (fake) secrets
```

Vault password: `sample-only`. Every value in it is a placeholder — nothing
here is a real credential.

| File | Host | Shows |
|---|---|---|
| `adminer.deployment.tsx` | `app-host` | Single container, port bound to one interface only via `__interfaceIp` |
| `gitea.deployment.tsx` | `db-host` | Shared podman network alias, no host-published port except SSH |
| `samba.deployment.tsx` | `app-host` | Multiple vault-backed users, `<PortRedirect>` for a privileged port |
| `hosts/app-host.tsx`, `hosts/db-host.tsx` | — | Rootless podman setup via `__onConnected`, per-OS `ctx.install`/`ctx.service` |
