import { Container, Pod, Port, EnvVar } from '@the-metro/cli';

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
