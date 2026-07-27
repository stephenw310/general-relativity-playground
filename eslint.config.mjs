import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  { ignores: [".next/**", "out/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  prettier,
  {
    // React Compiler lint rules vs. imperative three.js interop: scene
    // components mutate three.js objects (shader uniforms, pointer, cursor)
    // by design, and star geometry is randomized on creation.
    files: [
      "src/components/curved-grid.tsx",
      "src/components/mass-handles.tsx",
      "src/components/star-field.tsx",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
