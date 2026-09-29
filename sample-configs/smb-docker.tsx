import { Deployment } from '../src/lib/components/deployment.js';
import { Host, Machine, OS } from '../src/lib/components/host.js';
import { Container } from '../src/lib/components/container.js';
import { Port } from '../src/lib/components/resources/port.js';
import { EnvVar } from '../src/lib/components/resources/env-var.js';
import { VolumeMount } from '../src/lib/components/resources/volume-mount.js';
import { Volume } from '../src/lib/components/resources/volume.js';
import { Docker } from '../src/specifics/runtime/docker.js';
import { SshConnection } from '../src/specifics/connection/ssh_connection.js';
import { Apk } from '../src/specifics/package_manager/apk.js';

export default (
  <Deployment
    runtime={new Docker()}
    host={
      <Host address="12.0.0.1">
        <Machine arch="amd64" />
        <OS name="alpine" version="3.19" packageManager={new Apk()} />
      </Host>
    }
    connectVia={new SshConnection({ host: '12.0.0.1', user: 'root' })}
  >
    <Container runtime="docker" image="dperson/samba:latest">
      <Port from={445} to={445} />
      <Port from={139} to={139} />
      <EnvVar name="USER" value="smbuser;smbpass" />
      <EnvVar name="SHARE" value="shared;/shared;yes;no;no;smbuser" />
      <VolumeMount
        volume={<Volume path="/shared" size="10Gi" />}
        mountPath="/shared"
      />
    </Container>
  </Deployment>
);
