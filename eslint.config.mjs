import js from '@eslint/js';
import globals from 'globals';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';

const DEFAULT_RULES = {
    ...js.configs.recommended.rules,
    'semi': ['error', 'always'],
    'no-trailing-spaces': 'warn',
    'space-before-blocks': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
};

const DEFAULT_GLOBALS = {
    ...globals.browser,
    '$': 'readonly',
    'chrome': 'readonly',
    'Restyler': 'readonly',
};

export default [
    {
        ignores: ['**/vendor/*'],
    },
    {
        files: ['**/*.js'],
        rules: DEFAULT_RULES,
        languageOptions: {
            globals: DEFAULT_GLOBALS,
        },
    },
    {
        files: ['**/*.jsx'],
        ...reactRecommended,
        languageOptions: {
            ...reactRecommended.languageOptions,
            globals: DEFAULT_GLOBALS,
        },
        rules: {
            ...reactRecommended.rules,
            ...DEFAULT_RULES,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['webpack.config.js'],
        rules: DEFAULT_RULES,
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
]
