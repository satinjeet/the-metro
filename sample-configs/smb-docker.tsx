import {
  Deployment,
  Host,
  Machine,
  OS,
  Container,
  Port,
  EnvVar,
  VolumeMount,
  Volume,
  Docker,
  SshConnection,
  Apk,
} from '@the-metro/cli';

export default (
  <Deployment
    tags="smb"
    runtime={new Docker()}
    host={
      <Host address="12.0.0.1">
        <Machine arch="amd64" />
        <OS name="alpine" version="3.19" packageManager={new Apk()} />
      </Host>
    }
    connectVia={new SshConnection({ user: 'root' })}
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
