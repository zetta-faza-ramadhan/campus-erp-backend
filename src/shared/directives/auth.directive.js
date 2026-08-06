// *************** IMPORT LIBRARY ***************
const { mapSchema, getDirective, MapperKind } = require("@graphql-tools/utils");
const { defaultFieldResolver } = require("graphql");

// *************** IMPORT MODULE ***************
const AppError = require("../../core/error");
const { NormalizeGqlError } = require("../../core/graphql_error");

// *************** GLOBAL VARIABLES ***************
const AUTH_DIRECTIVE_SDL = `
  enum Role {
    ADMIN
    TEACHER
  }

  directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION
`;

// *************** ROLE HIERARCHY ***************
const ROLE_HIERARCHY = {
  ADMIN: ["ADMIN", "TEACHER"],
  TEACHER: ["TEACHER"],
};

// *************** DIRECTIVE TRANSFORMER ***************

/**
 * Transforms a GraphQL schema by applying the @auth directive.
 * Wraps resolvers to check authentication and authorization.
 *
 * @param {Object} schema - The original GraphQL schema.
 * @param {string} directiveName - The directive name (default: 'auth').
 * @returns {Object} The transformed schema.
 */
function AuthDirectiveTransformer(schema, directiveName = "auth") {
  return mapSchema(schema, {
    // *************** Field mapper: detect @auth and wrap the resolver
    /**
     * Walks every object field, reads the @auth directive, and wraps the field
     * resolver when present.
     *
     * @param {Object} fieldConfig - The field's config (contains resolve).
     * @returns {Object} The (possibly wrapped) fieldConfig.
     */
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(
        schema,
        fieldConfig,
        directiveName,
      )?.[0];
      if (!authDirective) return fieldConfig;

      const requiredRole = authDirective.requires || "ADMIN";
      const { resolve = defaultFieldResolver } = fieldConfig;

      // *************** Override resolver with role check
      /**
       * Wrapped resolver that enforces authentication and authorization before
       * delegating to the original resolver.
       *
       * @param {Object} source - The parent object.
       * @param {Object} args - The field arguments.
       * @param {Object} context - GraphQL context (contains user).
       * @param {Object} info - GraphQL field information.
       * @returns {Promise<*>} The result of the original resolver.
       */
      fieldConfig.resolve = async (source, args, context, info) => {
        try {
          // *************** Check if user is authenticated
          if (!context.user) {
            throw new AppError(
              "UNAUTHENTICATED",
              401,
              "You must be logged in.",
            );
          }

          // *************** Check if user has the required role
          const allowedRoles = ROLE_HIERARCHY[context.user.role] || [];
          if (!allowedRoles.includes(requiredRole)) {
            throw new AppError("FORBIDDEN", 403, "You do not have permission.");
          }

          // *************** Authorized — execute the original resolver
          return await resolve(source, args, context, info);
        } catch (err) {
          NormalizeGqlError(err);
        }
      };

      return fieldConfig;
    },
  });
}

// *************** EXPORT MODULE ***************
module.exports = { AUTH_DIRECTIVE_SDL, AuthDirectiveTransformer };
