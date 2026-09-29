import { Container } from '../src/lib/components/container.js';
import { Pod } from '../src/lib/components/pod.js';
import { Port } from '../src/lib/components/resources/port.js';
import { EnvVar } from '../src/lib/components/resources/env-var.js';

export default (
  <Pod name="nextcloud">
    <Port from={9000} to={9000} />
    <Container runtime="podman" image="nextcloud:29">
      <Port from={8080} to={80} />
      <EnvVar name="DB_PASSWORD" secretKey="nextcloud.db_password" />
    </Container>
    <Container runtime="docker" image="postgres:16">
      <Port from={5432} to={5432} />
      <EnvVar name="POSTGRES_PASSWORD" value="secret" />
    </Container>
  </Pod>
);
