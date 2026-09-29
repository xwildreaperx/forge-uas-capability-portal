export const isDevUserSwitcherEnabled = () =>
  process.env.NODE_ENV !== 'production' &&
  process.env.FORGE_ENABLE_DEV_USER_SWITCHER !== 'false';
