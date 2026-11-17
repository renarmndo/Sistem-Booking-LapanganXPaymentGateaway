import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
      'react-hooks': reactHooks,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**/*' },
        { type: 'feature', pattern: 'src/features/*/**', capture: ['featureName'] },
        { type: 'components-ui', pattern: 'src/components/ui/**/*' },
        { type: 'components-shared', pattern: 'src/components/shared/**/*' },
        { type: 'components-layout', pattern: 'src/components/layout/**/*' },
        { type: 'components-feedback', pattern: 'src/components/feedback/**/*' },
        { type: 'hooks', pattern: 'src/hooks/**/*' },
        { type: 'lib', pattern: 'src/lib/**/*' },
        { type: 'utils', pattern: 'src/utils/**/*' },
        { type: 'constants', pattern: 'src/constants/**/*' },
        { type: 'config', pattern: 'src/config/**/*' },
        { type: 'types', pattern: 'src/types/**/*' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: ['components-ui'],
              disallow: ['app', 'feature', 'components-layout', 'components-shared', 'lib'],
            },
            {
              from: ['components-shared'],
              disallow: ['app', 'feature'],
            },
            {
              from: ['hooks', 'utils', 'constants', 'config', 'types'],
              disallow: ['app', 'feature', 'components-ui', 'components-shared', 'components-layout', 'components-feedback'],
            },
            {
              from: ['feature'],
              disallow: [
                'app',
                ['feature', { featureName: '!${from.featureName}' }],
              ],
            },
          ],
        },
      ],
    },
  },
)
