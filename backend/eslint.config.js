import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

// Local guard rules for the payments read/write boundary (see AGENTS.md).
const paymentGuards = {
  rules: {
    // Non-admin order reads MUST scope by user_id. The read client is
    // service_role, which has BYPASSRLS and the table has RLS enabled with no
    // policies — so Postgres will happily return ANY user's row if the query
    // forgets the ownership filter. The DB is not a backstop; this is.
    'scope-order-read-by-user': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require user_id scoping on payment_orders_effective reads.',
        },
        schema: [],
        messages: {
          mustScope:
            "Non-admin order reads must scope by user_id: chain .eq('user_id', userId). service_role bypasses RLS, so the database will NOT enforce ownership. For a deliberate admin read, disable this rule on the line and say why.",
        },
      },
      create(context) {
        const VIEW = 'payment_orders_effective'
        const isUserId = (arg) =>
          arg && arg.type === 'Literal' && arg.value === 'user_id'

        return {
          CallExpression(node) {
            const callee = node.callee
            if (
              callee.type !== 'MemberExpression' ||
              callee.property.type !== 'Identifier' ||
              callee.property.name !== 'from'
            ) {
              return
            }
            const arg = node.arguments[0]
            if (!arg || arg.type !== 'Literal' || arg.value !== VIEW) {
              return
            }

            // Walk up the builder chain, looking for .eq('user_id', …) /
            // .in('user_id', …). .from(X).select().eq(...).eq(...) parses as
            // left-nested calls, so climbing parents reaches every link.
            let cur = node
            let scoped = false
            for (;;) {
              const member = cur.parent
              if (
                !member ||
                member.type !== 'MemberExpression' ||
                member.object !== cur
              ) {
                break
              }
              const call = member.parent
              if (call && call.type === 'CallExpression' && call.callee === member) {
                const name =
                  member.property.type === 'Identifier'
                    ? member.property.name
                    : null
                if (
                  (name === 'eq' || name === 'in') &&
                  isUserId(call.arguments[0])
                ) {
                  scoped = true
                }
                cur = call
              } else {
                cur = member
              }
            }

            if (!scoped) {
              context.report({ node, messageId: 'mustScope' })
            }
          },
        }
      },
    },
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.worker,
    },
    plugins: { local: paymentGuards },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      // Lazy-expiry law (AGENTS.md): order state has one canonical READ
      // source — the payment_orders_effective view (effective_status). Reading
      // the raw table in TS is always a stale-status bug. The lifecycle RPCs
      // still read/write the base table internally on purpose (row locks,
      // physical transitions, ON CONFLICT arbiter); that lives in SQL, not here.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='from'][arguments.0.value='payment_orders']",
          message:
            "Read orders via 'payment_orders_effective' (effective_status), never the raw 'payment_orders' table — see AGENTS.md lazy-expiry law.",
        },
      ],
      // Ownership scoping is application-level (see rule docs above).
      'local/scope-order-read-by-user': 'error',
    },
  },
  eslintConfigPrettier,
])
