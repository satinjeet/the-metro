// Kitchen-sink podman example - every component and prop `src/lib/` (the
// shipping DSL) supports, in one file, purely to demonstrate usage. Not a
// realistic single app - see the other sample-configs for a minimal,
// deployable one. This file must pass `themetro validate .` (render-time
// checks - a Logs<container> that doesn't exist, a persist without a name,
// etc - are exercised deliberately correctly here, not left broken).
//
// Consuming project? Same shapes, different imports - see AGENTS.md
// (published at the package root) for the '@the-metro/cli' import form.

// Bare '@the-metro/cli' imports, not relative ones into src/ - load on
// purpose. Hooks (__onConnected/__vault/__interfaceIp) are render-scoped
// via module-level state (hooks.ts's scopeStack) shared with the running
// jsx-runtime; esbuild's `packages: "external"` leaves a bare import like
// this unresolved so config_require.ts can redirect it to the CLI's one
// real copy at eval time. A *relative* import into src/ gets bundled as a
// private copy instead, with its own empty scopeStack - __onConnected then
// throws "called outside of a component render" even though it plainly is
// one. Every other sample in this directory avoids the trap only by never
// calling a hook; this one does, so it needs the real import form.
import {
  Deployment, Host, Machine, OS, Pod, Container, Management,
  Port, EnvVar, Volume, VolumeMount, Network, PortRedirect, NfsMount,
  HttpCheck, TcpCheck, Logs, Apk, Podman, SshConnection,
} from '@the-metro/cli';
import { __onConnected, __interfaceIp } from '@the-metro/cli/hooks';

// --- Host -------------------------------------------------------------
//
// `<Machine>`/`<OS>` are metadata only - they don't change how deploy runs,
// but an `<OS>` is required by anything that needs it later: <NfsMount>,
// <PortRedirect>, `persist`, a `service()` call inside `__onConnected`.
// `<NfsMount>` is a Host child, next to Machine/OS - it mounts an export on
// the host itself, shared by every container on this host, before any
// container runs.
function ProdHost() {
  // __onConnected runs once, right after the SSH connection opens, before
  // any resource work (networks, NFS mounts, containers). It must be called
  // during a component's own render - which is why it lives in a wrapper
  // component like this one, not inline in the JSX tree below.
  __onConnected(async (ctx) => {
    // ctx.connection is the open Connection. ctx.os/ctx.pkgManager mirror
    // the Host's <OS>. ctx.service(name) dispatches to OpenRC or systemd
    // for you - never hand-roll `rc-service`/`systemctl` yourself.
    await ctx.install(['curl']);
  });
  return (
    <Host address="10.0.0.10" name="gimli" description="homelab app server">
      <Machine arch="amd64" />
      <OS name="alpine" version="3.23" packageManager={new Apk()} />
      <NfsMount
        server="10.0.0.5"
        export="/srv/shared-data"
        at="/mnt/shared-data"
        // `_netdev` is always added; nothing else is pinned by default -
        // client and server negotiate an NFS version.
        options="rw"
      />
    </Host>
  );
}

// --- Connection -----------------------------------------------------------
//
// This file has no vault set up (it's a rendering demo, run through
// `themetro validate` with no live host or vault behind it), so it connects
// by key rather than by a vault-backed password. For a value that isn't an
// EnvVar (an SSH password, a root password, a registry credential) the
// pattern is __vault().val, read synchronously in any component body:
//
//   import { __vault } from '@the-metro/cli/hooks';
//   const { val } = __vault();
//   new SshConnection({ user: 'deploy', password: val`hosts.gimli.ssh_password` as string });
//
// EnvVar secrets use the shorter `secretKey` prop instead - see the
// Container below - which is lazy (no vault touch at render time, unlike
// __vault().val) and is the more common case.
function connectVia() {
  return new SshConnection({ user: 'deploy', privateKeyPath: '~/.ssh/id_ed25519' });
}

// --- Workload: a Pod (podman only - Docker has no pods) -----------------
function AppPod() {
  // An interface IP discovered only after the connection opens (e.g. a
  // Tailscale/VPN address not known at render time) - a Dynamic<string>,
  // resolved once, right after __onConnected hooks fire.
  const tailscaleIp = __interfaceIp('tailscale0');

  return (
    <Pod name="myapp">
      {/* A Pod-level Port is shared by every container in the pod. */}
      <Port from={9000} to={9000} />

      <Container
        runtime="podman"
        image="myapp/web:1.4.0"
        name="myapp-web"
        detach
        restart="always"
        // Brings the container back after a host reboot (installs an
        // OpenRC service / systemd unit). Requires `name`.
        persist
      >
        <Port from={8080} to={80} hostIp={tailscaleIp} />
        {/* Plain literal value. */}
        <EnvVar name="LOG_LEVEL" value="info" />
        {/* Vault-backed value - never write a real secret as a literal. */}
        <EnvVar name="DB_PASSWORD" secretKey="myapp.db_password" />
        {/* Bind mount: a host directory. */}
        <VolumeMount volume={<Volume path="/srv/myapp/data" size="10Gi" />} mountPath="/data" />
        {/* NFS-backed named volume: runtime-managed, container-scoped
            (contrast with the host-level <NfsMount> above). */}
        <VolumeMount
          volume={<Volume name="myapp-media" nfs={{ server: '10.0.0.5', export: '/srv/media' }} />}
          mountPath="/media"
          readOnly
        />
        <Network name="app_net" alias={['web', 'myapp']} />
      </Container>

      <Container runtime="podman" image="postgres:16" name="myapp-db" detach restart="on-failure">
        <EnvVar name="POSTGRES_PASSWORD" secretKey="myapp.db_password" />
        <VolumeMount volume={<Volume path="/srv/myapp/pgdata" />} mountPath="/var/lib/postgresql/data" />
        <Network name="app_net" alias="db" />
      </Container>
    </Pod>
  );
}

// --- Workload: a bare Container, sibling to the Pod above ---------------
//
// A privileged port (445, below 1024) published via an unprivileged
// rootless container (1445) plus a host-side iptables redirect - needs the
// Host's <OS> (installs iptables, persists the rule).
function CacheContainer() {
  return (
    <Container runtime="podman" image="redis:7" name="myapp-cache" detach restart="always">
      <PortRedirect from={445} to={1445} />
    </Container>
  );
}

// --- Deployment -----------------------------------------------------------
export default (
  <Deployment
    runtime={new Podman()}
    host={<ProdHost />}
    connectVia={connectVia()}
    // Comma-separated string, not an array - `themetro deploy --tag prod`
    // (or `deploy '#prod'`) matches any tag in this list.
    tags="prod,myapp"
  >
    <AppPod />
    <CacheContainer />

    {/* Declares what may be done post-deploy: themetro ctl / the MCP
        `manage` tool refuse anything not in `allow`. `shell` is the shell
        `themetro ctl myapp-web shell` opens (default /bin/sh). */}
    <Management allow="restart,stop,start,shell" shell="/bin/sh">
      {/* origin="host" runs the probe on the target over the existing SSH
          connection (sees a service bound only to localhost); "local" runs
          it from the machine running themetro. Both default to "host". */}
      <HttpCheck url="http://localhost:8080/healthz" expect={200} origin="host" timeout={5} />
      <TcpCheck host="10.0.0.10" port={9000} origin="local" timeout={5} />
      {/* Exactly one of container/unit. container must name a real
          container in this deployment (checked at render time - a typo
          here fails `themetro validate`, not just a later deploy). */}
      <Logs container="myapp-web" tail={200} since="1h" grep="ERROR" />
      <Logs unit="podman-restart" tail={100} />
    </Management>
  </Deployment>
);
