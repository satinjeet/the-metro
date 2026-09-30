import {
  Container,
  Port,
  EnvVar,
  Volume,
  VolumeMount,
} from '@the-metro/cli';

export default (
  <Container runtime="podman" image="nextcloud:29">
    <Port from={8080} to={80} />
    <EnvVar name="DB_PASSWORD" secretKey="nextcloud.db_password" />
    <VolumeMount volume={<Volume path="/data" size="10Gi" />} mountPath="/mnt/data" />
  </Container>
);
