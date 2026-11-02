import DriverShell from './DriverShell';
import PaymentHistory from 'src/features/subscription/PaymentHistory';

export default function DriverPayments() {
  return (
    <DriverShell title="پرداخت‌ها">
      <PaymentHistory />
    </DriverShell>
  );
}
