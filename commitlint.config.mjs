const config = {
  extends: ['@commitlint/config-conventional'],
  // Dependabot picks its own subject case ("Bump ..."); its PRs are squashed with a lowercase subject.
  ignores: [(message) => message.includes('Signed-off-by: dependabot[bot]')],
};

export default config;
