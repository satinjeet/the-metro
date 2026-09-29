import {
  Deployment,
  Container,
  Port,
  EnvVar,
  Volume,
  VolumeMount,
  Network,
  Podman,
  SshConnection,
} from '@the-metro/cli';
import { __vault } from '@the-metro/cli/hooks';
import DbHost from './hosts/db-host.js';

const CONTAINER_NAME = 'gitea';

/**
 * A self-hosted Gitea instance sharing a podman network with a separately
 * managed MySQL container ("database") and a reverse proxy - both DNS
 * aliases on the same network, so only the SSH clone port needs to be
 * published on the host at all. Adapted from a real production config.
 */
function GiteaDeployment() {
  const { val } = __vault();
  const sshPassword = val`hosts.dbHost.sshPassword` as string;
  const dbUser = val`apps.gitea.secrets.db.user` as string;
  const dbPassword = val`apps.gitea.secrets.db.password` as string;

  return (
    <Deployment
      tags="prod, gitea"
      runtime={new Podman()}
      host={DbHost}
      connectVia={new SshConnection({ user: 'deploy', password: sshPassword })}
    >
      <Container
        runtime="podman"
        image="docker.io/gitea/gitea:1.27.3"
        name={CONTAINER_NAME}
        detach
        restart="always"
        persist
      >
        <Network name="app_net" alias="gitea" />
        <Port from={14022} to={14022} />

        <EnvVar name="USER_UID" value="1000" />
        <EnvVar name="USER_GID" value="1000" />
        <EnvVar name="TZ" value="America/New_York" />

        <EnvVar name="GITEA__database__DB_TYPE" value="mysql" />
        <EnvVar name="GITEA__database__HOST" value="database:3306" />
        <EnvVar name="GITEA__database__NAME" value="gitea" />
        <EnvVar name="GITEA__database__USER" value={dbUser} />
        <EnvVar name="GITEA__database__PASSWD" value={dbPassword} />

        <EnvVar name="GITEA__API__ENABLE_SWAGGER" value="true" />

        <EnvVar name="GITEA__server__DOMAIN" value="git.example.com" />
        <EnvVar name="GITEA__server__SSH_DOMAIN" value="git.example.com" />
        <EnvVar name="GITEA__server__ROOT_URL" value="https://git.example.com/" />
        <EnvVar name="GITEA__server__SSH_PORT" value="14022" />
        <EnvVar name="GITEA__server__SSH_LISTEN_PORT" value="14022" />
        <EnvVar name="GITEA__server__START_SSH_SERVER" value="true" />

        <EnvVar name="ROOT" value="/data/repositories" />

        <VolumeMount
          volume={<Volume path="/home/deploy/.data/gitea" />}
          mountPath="/data"
        />
      </Container>
    </Deployment>
  );
}

export default <GiteaDeployment />;
