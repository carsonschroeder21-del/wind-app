// Only needed for react-native-reanimated's worklet transform (used by the Home screen's
// map expand/collapse animation) — the project ran with Expo's built-in default babel
// config until now, so babel-preset-expo has to be listed explicitly here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last in the plugins list — Reanimated's own requirement.
    plugins: ['react-native-reanimated/plugin'],
  };
};
