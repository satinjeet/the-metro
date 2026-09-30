import { Host, Machine, OS, AptGet } from '@the-metro/cli';

export default (
  <Host address="10.0.0.10">
    <Machine arch="amd64" />
    <OS name="debian" version="12" packageManager={new AptGet()} />
  </Host>
);
