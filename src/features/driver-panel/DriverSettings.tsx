import { FiltersContent } from 'src/features/company-cargo/CargoFilters';
import DriverShell from './DriverShell';

export default function DriverFilters() {
  return (
    <DriverShell title="تنظیمات نمایش بار">
      <FiltersContent audience="driver" />
    </DriverShell>
  );
}
