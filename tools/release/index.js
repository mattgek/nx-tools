const {
  createCommitTransformerWithScopeFilter,
} = require('./commit-transformer');
const { createReleaseRulesWithScopeFilter } = require('./release-rules');

const buildReversePath = path =>
  path
    .split('/')
    .map(() => '..')
    .join('/');

const formatFile = file => `nx format:write --files ${file}`;
const copyFile = (file, dest) => `cp ${file} ${dest}`;

function createReleaseConfigWithScopeFilter({
  projectScope,
  projectRoot,
  buildOutput,
}) {
  projectRoot = projectRoot || `libs/${projectScope}`;
  buildOutput = buildOutput || `dist/libs/${projectScope}`;

  const relativeWorkspaceRoot = buildReversePath(projectRoot);
  const relativeBuildOutput = `${relativeWorkspaceRoot}/${buildOutput}`;

  const changelogFile = 'CHANGELOG.md';
  const releaseCommit = `chore(${projectScope}): release \${nextRelease.version}\n\n\${nextRelease.notes}\n\n***\n[skip ci]`;
  return {
    plugins: [
      [
        '@semantic-release/commit-analyzer',
        {
          preset: 'angular',
          releaseRules: createReleaseRulesWithScopeFilter(projectScope),
          parserOpts: {
            noteKeywords: ['BREAKING', 'BREAKING CHANGE', 'BREAKING CHANGES'],
          },
        },
      ],
      '@semantic-release/release-notes-generator',
      ['@semantic-release/changelog', { changelogFile }],
      '@semantic-release/github',
      ['@semantic-release/npm', { pkgRoot: relativeBuildOutput }],
      [
        '@semantic-release/exec',
        {
          prepareCmd: [
            formatFile(`${projectRoot}/${changelogFile}`),
            copyFile(`${projectRoot}/${changelogFile}`, buildOutput),
          ].join(' && '),
          execCwd: relativeWorkspaceRoot,
        },
      ],
      [
        '@semantic-release/git',
        {
          assets: [changelogFile],
          message: releaseCommit,
        },
      ],
    ],
    writerOpts: {
      transform: createCommitTransformerWithScopeFilter(projectScope),
    },
    tagFormat: `${projectScope}/v\${version}`,
    branches: [
      'master',
      'next',
      { name: 'beta', prerelease: true },
      { name: 'alpha', prerelease: true },
    ],
  };
}

module.exports = {
  createReleaseConfigWithScopeFilter,
};