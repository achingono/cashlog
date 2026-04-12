const ASSET_TYPES = new Set(['CHECKING', 'SAVINGS', 'INVESTMENT', 'OTHER']);
const LIABILITY_TYPES = new Set(['CREDIT_CARD', 'LOAN', 'MORTGAGE']);

export function isAssetType(accountType: string): boolean {
  return ASSET_TYPES.has(accountType);
}

export function isLiabilityType(accountType: string): boolean {
  return LIABILITY_TYPES.has(accountType);
}
