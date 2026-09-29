import {
  Deployment,
  Container,
  Port,
  EnvVar,
  Podman,
  SshConnection,
} from '@the-metro/cli';
import { __vault, __interfaceIp } from '@the-metro/cli/hooks';
import AppHost from './hosts/app-host.js';

const CONTAINER_NAME = 'adminer';

/**
 * A single-container deployment: Adminer, a lightweight DB admin UI, bound
 * only to a private VPN interface rather than the public/LAN address.
 * Adapted from a real production config.
 */
function AdminerDeployment() {
  const { val } = __vault();
  const sshPassword = val`hosts.appHost.sshPassword` as string;
  const adminer = val`apps.adminer` as { username: string; password: string };
  // A self-filling Dynamic: resolved once connected, after the host's own
  // network interfaces are known - see interfaceIp in the wiki's API Reference.
  const vpnIp = __interfaceIp('tailscale0');

  return (
    <Deployment
      tags="prod, adminer"
      runtime={new Podman()}
      host={AppHost}
      connectVia={new SshConnection({ user: 'deploy', password: sshPassword })}
    >
      <Container
        runtime="podman"
        image="docker.io/adminer:latest"
        name={CONTAINER_NAME}
        detach
        restart="always"
        persist
      >
        {/* Published on the host's VPN interface only - never public/LAN. */}
        <Port from={8081} to={8080} hostIp={vpnIp} />
        {/* Not a secret - just a hostname; change it here if the DB moves. */}
        <EnvVar name="ADMINER_DEFAULT_SERVER" value="db-host" />
        <EnvVar name="ADMINER_USERNAME" value={adminer.username} />
        <EnvVar name="ADMINER_PASSWORD" value={adminer.password} />
      </Container>
    </Deployment>
  );
}

export default <AdminerDeployment />;
