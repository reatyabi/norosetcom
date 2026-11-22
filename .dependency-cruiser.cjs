/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-must-not-depend-on-products',
      comment: 'packages/core (auth/tenancy) is shared infrastructure and must not depend on product code.',
      severity: 'error',
      from: { path: '^packages/core' },
      to: { path: '^products/' },
    },
    {
      name: 'norolink-must-not-depend-on-noroform',
      comment: 'products must not depend on each other.',
      severity: 'error',
      from: { path: '^products/norolink' },
      to: { path: '^products/noroform' },
    },
    {
      name: 'noroform-must-not-depend-on-norolink',
      comment: 'products must not depend on each other.',
      severity: 'error',
      from: { path: '^products/noroform' },
      to: { path: '^products/norolink' },
    },
    {
      name: 'products-must-not-depend-on-norofile',
      comment: 'other products use files only through the FILE_SERVICE port in @noroset/core, never norofile itself.',
      severity: 'error',
      from: { path: '^products/(noroform|norolink)' },
      to: { path: '^products/norofile' },
    },
    {
      name: 'norofile-must-not-depend-on-products',
      comment: 'norofile knows owners only as (owner_type, owner_id); it must not import other products.',
      severity: 'error',
      from: { path: '^products/norofile' },
      to: { path: '^products/(noroform|norolink)' },
    },
    {
      name: 'admin-must-not-depend-on-products',
      comment: 'admin serves other products only through core ports (PLAN_RESOLVER, …); docs/architecture.md §9.11.',
      severity: 'error',
      from: { path: '^products/admin' },
      to: { path: '^products/(noroform|norolink|norofile)' },
    },
    {
      name: 'products-must-not-depend-on-admin',
      comment: 'products never know the platform admin module; they read plan/module state from core ports.',
      severity: 'error',
      from: { path: '^products/(noroform|norolink|norofile)' },
      to: { path: '^products/admin' },
    },
    {
      name: 'blog-must-not-depend-on-products',
      comment: 'blog uses files only through the FILE_SERVICE port and the admin context port in core (docs/architecture.md §9.12).',
      severity: 'error',
      from: { path: '^products/blog' },
      to: { path: '^products/(noroform|norolink|norofile|admin)' },
    },
    {
      name: 'products-must-not-depend-on-blog',
      comment: 'products must not depend on each other.',
      severity: 'error',
      from: { path: '^products/(noroform|norolink|norofile|admin)' },
      to: { path: '^products/blog' },
    },
    {
      name: 'only-norofile-may-use-s3',
      comment: 'norofile is the single S3 file service of the platform (docs/architecture.md §9.9).',
      severity: 'error',
      from: { pathNot: '^products/norofile/' },
      to: { path: ['node_modules/@aws-sdk/', '^@aws-sdk/'] },
    },
    {
      name: 'no-deep-imports-into-other-product',
      comment: 'cross-product access is only allowed through a product index.ts (public API).',
      severity: 'error',
      from: { path: '^products/([^/]+)/' },
      to: {
        path: '^products/[^/]+/(api|ui)/.+',
        // داخل همان محصول آزاد است ($1 = محصول مبدأ).
        pathNot: ['index\\.ts$', '^products/$1/'],
      },
    },
    {
      name: 'only-package-index-imports',
      comment: 'apps and products may only import the public index of a package (no deep imports).',
      severity: 'error',
      from: { path: '^(apps|products)/' },
      to: { path: '^packages/[^/]+/.+', pathNot: 'index\\.(ts|js|d\\.ts)$' },
    },
    {
      name: 'core-must-import-db-only-from-index',
      comment: 'packages/core may only import @noroset/db from its index.',
      severity: 'error',
      from: { path: '^packages/core' },
      to: { path: '^packages/db/', pathNot: 'index\\.(ts|js|d\\.ts)$' },
    },
    {
      name: 'norolink-must-not-depend-on-field-engine',
      comment: 'norolink must not depend on field-engine at all.',
      severity: 'error',
      from: { path: '^products/norolink' },
      to: { path: '^packages/field-engine' },
    },
    {
      name: 'field-engine-must-not-depend-on-internal-packages',
      comment: 'field-engine is a pure core (docs/architecture.md §5): no internal packages, apps or products.',
      severity: 'error',
      from: { path: '^packages/field-engine/' },
      // resolved workspace path, or bare @noroset/* when it is not a declared dependency
      to: { path: ['^(apps|products|packages)/', '^@noroset/'], pathNot: '^packages/field-engine/' },
    },
    {
      name: 'field-engine-values-must-be-self-contained',
      comment:
        'value types (docs/architecture.md §8.6) know nothing about forms: src/values imports only itself (and zod), so it can move to a shared package unchanged.',
      severity: 'error',
      from: { path: '^packages/field-engine/src/values/' },
      to: { path: '^packages/field-engine/', pathNot: '^packages/field-engine/src/values/' },
    },
    {
      name: 'field-engine-must-not-depend-on-frameworks',
      comment: 'field-engine must not depend on react / nest / drizzle / pg (only zod at runtime).',
      severity: 'error',
      from: { path: '^packages/field-engine/' },
      to: {
        // resolved (node_modules/.pnpm/.../node_modules/<pkg>/) or unresolved (bare <pkg>)
        path: [
          'node_modules/(react|react-dom|@nestjs|drizzle-orm|drizzle-kit|pg|@types/pg)/',
          '^(react|react-dom|@nestjs|drizzle-orm|drizzle-kit|pg|@types/pg)(/|$)',
        ],
      },
    },
    {
      name: 'only-db-may-depend-on-drizzle-pg',
      comment: 'only packages/db may depend on drizzle-orm / drizzle-kit / pg.',
      severity: 'error',
      from: { pathNot: '^packages/db/' },
      to: { path: '^(drizzle-orm|drizzle-kit|pg|@types/pg)(/|$)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    exclude: {
      path: ['(^|/)\\.next/', '(^|/)dist/', '(^|/)node_modules/', '\\.d\\.ts$', '(^|/)\\.git/', '(^|/)\\.claude/'],
    },
  },
};
