/* Feature list: which features are free, for subscribers, or come with a pack.
   canUse() is the one check the app asks before offering a feature or a media item. Today everything answers yes;
   when subscriptions arrive (RevenueCat), canUse looks up the tier here or on the item and checks what the user owns. */
export const FEATURES={
  record:'free',upload:'free',trim:'free',lowCut:'free',tame:'free',volume:'free',
  echo:'free',reverb:'free',repeat:'free',repeatInTime:'free',octave:'free',background:'free',
  shareMp3:'free',video:'free',ownPhoto:'free',
};
/* f: a feature name from FEATURES, or a media item from the catalog (it carries its own tier) */
export function canUse(f){return true}  // eslint-disable-line no-unused-vars
