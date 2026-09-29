import { Container } from '../src/lib/components/container.js';
import { Port } from '../src/lib/components/resources/port.js';
import { EnvVar } from '../src/lib/components/resources/env-var.js';
import { Volume } from '../src/lib/components/resources/volume.js';
import { VolumeMount } from '../src/lib/components/resources/volume-mount.js';

export default (
  <Container runtime="podman" image="nextcloud:29">
    <Port from={8080} to={80} />
    <EnvVar name="DB_PASSWORD" secretKey="nextcloud.db_password" />
    <VolumeMount volume={<Volume path="/data" size="10Gi" />} mountPath="/mnt/data" />
  </Container>
);
