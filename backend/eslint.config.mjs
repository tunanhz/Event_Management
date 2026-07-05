// ESLint flat config cho backend (Express + TypeScript)
// Mục tiêu: bắt lỗi thật (bug-prone) mà không chặn cứng vì nợ style cũ.
// Các rule dễ "nổ" trên code hiện có được hạ xuống "warn" (không fail CI),
// chỉ lỗi nghiêm trọng (syntax, no-undef thật...) mới fail.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Bỏ qua output & khai báo type sinh tự động
  { ignores: ["dist/**", "node_modules/**", "**/*.d.ts"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Cảnh báo, không chặn merge — dọn dần
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Nợ style hiện có -> warn (dọn dần), không chặn merge
      "no-useless-catch": "warn",
      // Cho phép console.* ở backend (logging)
      "no-console": "off",
    },
  }
);
