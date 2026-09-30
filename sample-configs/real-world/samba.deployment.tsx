import {
  Deployment,
  Container,
  PortRedirect,
  EnvVar,
  Volume,
  VolumeMount,
  Podman,
  SshConnection,
} from '@the-metro/cli';
import { __vault } from '@the-metro/cli/hooks';
import AppHost from './hosts/app-host.js';

const CONTAINER_NAME = 'samba';

// One vault key per user rather than a single list-typed key: a list secret
// records only "this is a list" in the schema, not its length or contents,
// so redacted mode (validate/manifest/tree) can't resolve it at all. Scalar
// leaves like these resolve to a placeholder each and render fine redacted.
const USERS = ['primary', 'guest'] as const;

/**
 * A Samba file share with a couple of users, published on the privileged
 * port 445 via a NAT redirect - rootless podman can't bind 445 directly.
 * Adapted from a real production config.
 */
function SambaDeployment() {
  const { val } = __vault();
  const sshPassword = val`hosts.appHost.sshPassword` as string;

  // dperson/samba USER format: one env var per user (USER, USER0, USER1, ...),
  // each "name;password[;ID;group;GID]". A single comma-joined USER value
  // is WRONG - the entrypoint only splits on ";", so extra users' fields get
  // parsed as this user's optional ID/group/GID (e.g. "invalid number").
  const primaryUsername = val`apps.samba.primary.username` as string;

  return (
    <Deployment
      tags="prod, samba"
      runtime={new Podman()}
      host={AppHost}
      connectVia={new SshConnection({ user: 'deploy', password: sshPassword })}
    >
      <Container
        runtime="podman"
        image="dperson/samba:latest"
        name={CONTAINER_NAME}
        detach
        restart="always"
        persist
      >
        {/* Rootless podman can't bind 445: publish 1445, and a nat REDIRECT
           sends the real 445 there. */}
        <PortRedirect from={445} to={1445} />
        {USERS.map((key, i) => {
          const username = val`apps.samba.${key}.username` as string;
          const password = val`apps.samba.${key}.password` as string;
          return <EnvVar name={`USER${i}`} value={`${username};${password}`} />;
        })}
        <EnvVar
          name="SHARE"
          value={`shared;/shared;yes;no;no;${primaryUsername}`}
        />
        <VolumeMount
          volume={<Volume path="/mnt/storage/samba" size="476Gi" />}
          mountPath="/shared"
        />
      </Container>
    </Deployment>
  );
}

export default <SambaDeployment />;
