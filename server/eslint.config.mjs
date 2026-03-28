import js from "@eslint/js";
import google from "eslint-config-google";
import prettierConfig from "eslint-config-prettier";
import reactPlugin from "eslint-plugin-react";
import prettierPlugin from "eslint-plugin-prettier";
import babelParser from "@babel/eslint-parser";
import globals from "globals";

export default [
  js.configs.recommended,

  {
    ...google,

    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2018,
      sourceType: "module",
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },
    },

    plugins: {
      react: reactPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      ...prettierConfig.rules,

      "prettier/prettier": "error",
      "require-jsdoc": "off",
      "valid-jsdoc": "off",
      "new-cap": "off",
    },

    settings: {
      react: {
        version: "^16.8.6",
      },
    },
  },

  prettierConfig,
];
