const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// withKotlinExperimentalOptIn';

// Expo SDK 57's autolinked-module Kotlin compile depends on classes some modules mark
// `@UnstableReactNativeAPI` (e.g. expo-video's VideoModule) — Kotlin makes referencing
// those a hard compile error unless the consuming module opts in. The generated
// ExpoModulesPackageList.kt (built fresh by expo-modules-autolinking on every EAS build,
// not something we can hand-edit since android/ isn't checked in) references those classes
// without doing so, which fails `:expo:compileDebugKotlin` with "This API is experimental
// and is likely to change or to be removed in the future." Opting in for every subproject's
// Kotlin compile task here — via the standard Kotlin compiler flag, applied at the root
// build.gradle level so it survives every `expo prebuild` regeneration — fixes it without
// patching third-party package source.
const OPT_IN_BLOCK = `
${MARKER}
subprojects { subproject ->
  subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach { task ->
    task.compilerOptions.freeCompilerArgs.add("-opt-in=com.facebook.react.common.annotations.UnstableReactNativeAPI")
  }
}
`;

function withKotlinExperimentalOptIn(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += OPT_IN_BLOCK;
    }
    return config;
  });
}

module.exports = withKotlinExperimentalOptIn;
