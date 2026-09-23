// Matches transport_backend/src/domain/enums/subscription.ts.
export enum AccountType {
  Driver = 'DRIVER',
  Company = 'COMPANY',
  Broker = 'BROKER',
}

export interface RegisterRequest {
  phoneNumber: string;
  username: string;
  password: string;
  accountType: AccountType;
}

export interface RegisteredAccount {
  id: string;
  username: string;
  accountType: AccountType;
}
