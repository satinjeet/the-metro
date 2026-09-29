import { Host, Machine, OS, AptGet } from '@the-metro/cli';
import { __onConnected, __vault } from '@the-metro/cli/hooks';

/**
 * Shared Host component - reachable by hostname, not IP. Its images come
 * from docker.io only, so no registry login here.
 *
 * db-host is debian: systemd already mounts the unified cgroup2 hierarchy,
 * so there's no cgroup-tools step here, unlike app-host's Alpine setup.
 */
function DbHost(): ReturnType<typeof Host> {
  const { val } = __vault();

  __onConnected(async (ctx) => {
    ctx.connection.rootPasswd = val`hosts.dbHost.rootPassword` as string;
    await ctx.install({ debian: ['podman'] });
  });

  return (
    <Host name="db-host" address="db-host" description="git + database host">
      <Machine arch="amd64" />
      <OS name="debian" version="12" packageManager={new AptGet()} />
    </Host>
  );
}

export default <DbHost />;
