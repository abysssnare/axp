import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // 全局基线：站点既有写作习惯的兼容开关（no-undef 由 TS 编译器与 tsc 门禁负责）
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",

      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // General JavaScript rules
      "prefer-const": "off",
      "no-undef": "off",
      "no-console": "off",
      "no-debugger": "off",
      "no-empty": "off",
      "no-irregular-whitespace": "off",
      "no-case-declarations": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "off",
      "no-unreachable": "off",
      "no-useless-escape": "off",
    },
  },
  {
    // E08：站点代码（src/）恢复能挡真实问题的质量门禁：
    // unused-vars / 不可达代码 / fallthrough 为 error，hooks 依赖为 warn。
    // axp/ 规范项目由 axp-selfcheck / spec-consistency 两个 CI job 单独把关，不在此列。
    files: ["src/**/*.{ts,tsx,mjs,js}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-useless-escape": "error",
      "no-fallthrough": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // 本沙箱环境目录（与 .gitignore / tsconfig exclude 对齐，不入库）
      "examples/**",
      "skills/**",
      "upload/**",
      "download/**",
      "mini-services/**",
      "tests/**",
      ".zscripts/**",
    ],
  },
];

export default eslintConfig;
