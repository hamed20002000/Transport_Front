import DriverShell from './DriverShell';
import SubscriptionPurchase from 'src/features/subscription/SubscriptionPurchase';
import { recheckSubscription } from './DriverShell';

export default function DriverSubscription() {
  return (
    <DriverShell title="اشتراک">
      <SubscriptionPurchase onActivated={recheckSubscription} />
    </DriverShell>
  );
}
