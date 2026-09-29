import { Host, Machine, OS, Apk, Podman } from '@the-metro/cli';
import { __onConnected, __vault } from '@the-metro/cli/hooks';

const REGISTRY = 'git.example.com';

/**
 * Shared Host component - reachable by hostname, not IP. Import this into
 * any deployment that targets app-host instead of redeclaring the Host
 * inline. Adapted from a real production config: an Alpine box running
 * several small services under rootless podman.
 */
function AppHost(): ReturnType<typeof Host> {
  const { val } = __vault();

  __onConnected(async (ctx) => {
    ctx.connection.rootPasswd = val`hosts.appHost.rootPassword` as string;

    // Alpine has no systemd, so nothing mounts the unified cgroup2 hierarchy
    // by default - crun then fails with "invalid file system type on
    // /sys/fs/cgroup". OpenRC's `cgroups` service does it instead.
    if (ctx.os?.name === 'alpine') {
      await ctx.install({ alpine: ['cgroup-tools'] });
      await ctx.service('cgroups').enable({ runlevel: 'sysinit' });
      await ctx.service('cgroups').start();
    }
    await ctx.install({ alpine: ['shadow', 'podman'], debian: ['podman'] });
    await new Podman().prepareRootless(ctx.connection);

    // A private registry's cert chain not in the system trust store needs
    // marking insecure explicitly for rootless podman.
    const podman = new Podman();
    await podman.allowInsecureRegistry(ctx.connection, REGISTRY);
    await podman.login(
      REGISTRY,
      val`hosts.appHost.registry.user` as string,
      val`hosts.appHost.registry.password` as string,
      ctx.connection,
    );
  });

  return (
    <Host name="app-host" address="app-host" description="general-purpose app server">
      <Machine arch="amd64" />
      <OS name="alpine" version="3.23" packageManager={new Apk()} />
    </Host>
  );
}

export default <AppHost />;
