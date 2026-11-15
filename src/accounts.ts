import approvedPublicAccounts from './accounts.public.json';

export type Account = {role: string; name: string; bank: string; number: string};
export type AccountGroup = {label: string; accounts: Account[]};

// The user explicitly approved these six accounts for GitHub and the public site.
export const accountGroups: AccountGroup[] = approvedPublicAccounts;
