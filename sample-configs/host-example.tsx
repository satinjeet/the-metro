import { Host } from '../src/lib/components/host.js';
import { Machine } from '../src/lib/components/host.js';
import { OS } from '../src/lib/components/host.js';
import { AptGet } from '../src/specifics/package_manager/apt_get.js';

export default (
  <Host address="10.0.0.10">
    <Machine arch="amd64" />
    <OS name="debian" version="12" packageManager={new AptGet()} />
  </Host>
);
