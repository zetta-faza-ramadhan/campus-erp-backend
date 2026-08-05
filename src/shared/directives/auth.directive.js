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
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(
        schema,
        fieldConfig,
        directiveName,
      )?.[0];
      if (!authDirective) return fieldConfig;

      const requiredRole = authDirective.requires || "ADMIN";
      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = async (source, args, context, info) => {
        try {
          // *************** Check if user is authenticated
          if (!context.user) {
            throw new AppError("UNAUTHENTICATED", 401, "You must be logged in.");
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
