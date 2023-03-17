module.exports = {
	extends: ["plugin:@wordpress/eslint-plugin/recommended"],
	parserOptions: {
		ecmaVersion: 2021,
		requireConfigFile: false,
		babelOptions: {
			presets: [require.resolve("@wordpress/babel-preset-default")],
		},
	},
	root: true,
	env: {
		browser: true,
		es6: true,
		jquery: true,
	},
	rules: {
		"@wordpress/no-global-event-listener": 0, // Disable. We don't use React-based components.
		"space-before-function-paren": 0,
		camelcase: 0,
		"jsx-a11y/label-has-associated-control": 0,
		"no-undef": 0,
		"no-console": ["error", { allow: ["warn", "error", "table"] }],
		"prettier/prettier": [
			"error",
			{
				endOfLine: "auto",
			},
		],
	},
};
