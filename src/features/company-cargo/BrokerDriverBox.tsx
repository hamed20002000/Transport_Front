import { useState } from 'react';
import { LoaderCircle, Truck, UserPlus } from 'lucide-react';
import type { BrokerDriver } from 'src/features/driver-panel/api';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { factoryError, inviteSmsText } from 'src/features/factory/api';
import { inviteDrivers } from './driverInvitesApi';
import { PhoneLinks } from './components';
import { groupDigits } from 'src/shared/utils/digitGroups';

export type RequestDriver = BrokerDriver & { companyDriver: boolean };

/**
 * The driver a broker asked the load for (no account is made for it): who it is, and, when it is not one of the
 * company's drivers yet, «دعوت این راننده» (the usual driver invite by its mobile).
 */
export default function BrokerDriverBox({ driver }: { driver: RequestDriver }) {
  const toast = useToast();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>(driver.companyDriver ? 'sent' : 'idle');

  async function invite() {
    setState('sending');
    try {
      const { outcomes, sms } = await inviteDrivers([{ mobile: driver.mobile, name: driver.name }]);
      const outcome = outcomes[0];
      if (outcome?.status === 'refused') {
        setState('idle');
        return toast.error(outcome.reason);
      }
      setState('sent');
      toast.success(`${driver.name} دعوت شد. ${inviteSmsText(sms, 'راننده')}`);
    } catch (error) {
      setState('idle');
      toast.error(factoryError(error));
    }
  }

  return (
    <div className="tw-space-y-1.5 tw-rounded-xl tw-border tw-border-dashed tw-border-brand-orange/50 tw-bg-brand-orange-soft/30 tw-p-3 tw-text-sm">
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-font-bold">
        <Truck size={15} aria-hidden /> برای راننده: {driver.name}
      </p>
      <p className="tw-m-0 tw-flex tw-flex-wrap tw-gap-x-3 tw-gap-y-1 tw-text-xs">
        <span>
          کد ملی <bdi dir="ltr">{driver.nationalCode}</bdi>
        </span>
        <span>پلاک {driver.plate}</span>
        {driver.transitPlate && (
          <span>
            ترانزیت <bdi dir="ltr">{driver.transitPlate}</bdi>
          </span>
        )}
      </p>
      {(driver.companyName || driver.fare || driver.referrer) && (
        <p className="tw-m-0 tw-flex tw-flex-wrap tw-gap-x-3 tw-gap-y-1 tw-text-xs">
          {driver.companyName && <span>شرکت {driver.companyName}</span>}
          {driver.fare && <span>کرایه {groupDigits(driver.fare)}</span>}
          {driver.referrer && <span>معرف {driver.referrer}</span>}
        </p>
      )}
      <PhoneLinks phones={[driver.mobile]} />
      {state === 'sent' ? (
        <p className="tw-m-0 tw-text-xs tw-text-emerald-700">{driver.companyDriver ? 'از رانندگان شماست.' : 'دعوت شد.'}</p>
      ) : (
        <button
          type="button"
          onClick={invite}
          disabled={state === 'sending'}
          className="tw-inline-flex tw-h-9 tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-xs tw-font-bold hover:tw-bg-brand-sky"
        >
          {state === 'sending' ? <LoaderCircle size={14} className="tw-animate-spin" aria-hidden /> : <UserPlus size={14} aria-hidden />}
          این راننده در ترابوت نیست؛ دعوتش کنید
        </button>
      )}
    </div>
  );
}
