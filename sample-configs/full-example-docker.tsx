// Docker variant of full-example-podman.tsx. The one structural difference
// docker forces: a Deployment whose runtime is `new Docker()` can only hold
// bare <Container> children, never a <Pod> - podman is the only runtime with
// pods (DeploymentProps's `children` type is conditional on `runtime`, so
// this is a compile-time restriction, not just a runtime one).
//
// Everything else - resources, <Management>, hooks - works identically
// under Docker; this file only shows what differs.

import {
  Deployment, Host, Machine, OS, Container, Management,
  Port, EnvVar, Volume, VolumeMount, Network,
  HttpCheck, Logs, AptGet, Docker, SshConnection,
} from '@the-metro/cli';
import { __onConnected } from '@the-metro/cli/hooks';

function DockerHost() {
  __onConnected(async (ctx) => {
    await ctx.install(['curl']);
  });
  return (
    <Host address="10.0.0.20" name="legolas">
      <Machine arch="amd64" />
      <OS name="debian" version="12" packageManager={new AptGet()} />
    </Host>
  );
}

export default (
  <Deployment
    runtime={new Docker()}
    host={<DockerHost />}
    connectVia={new SshConnection({ user: 'deploy', privateKeyPath: '~/.ssh/id_ed25519' })}
    tags="prod,gitea"
  >
    {/* runtime="docker" here refers to the Container's own runtime prop
        (podman/docker are chosen per-Container too, not only inherited
        from Deployment - see AGENTS.md's "two independent runtime knobs"
        note). It must agree with the Deployment's own runtime={new Docker()}
        above; a mismatch is a real footgun this DSL doesn't catch for you. */}
    <Container runtime="docker" image="gitea/gitea:1.22" name="gitea" detach restart="always">
      <Port from={3000} to={3000} />
      <Port from={2222} to={22} />
      <EnvVar name="GITEA__database__PASSWD" secretKey="gitea.db_password" />
      <VolumeMount volume={<Volume path="/srv/gitea/data" />} mountPath="/data" />
      <Network name="gitea_net" alias="gitea" />
    </Container>

    <Container runtime="docker" image="postgres:16" name="gitea-db" detach restart="always">
      <EnvVar name="POSTGRES_PASSWORD" secretKey="gitea.db_password" />
      <VolumeMount volume={<Volume path="/srv/gitea/pgdata" />} mountPath="/var/lib/postgresql/data" />
      <Network name="gitea_net" alias="db" />
    </Container>

    <Management allow="restart,stop,start">
      <HttpCheck url="http://localhost:3000/api/healthz" expect={200} />
      <Logs container="gitea" tail={200} />
    </Management>
  </Deployment>
);
