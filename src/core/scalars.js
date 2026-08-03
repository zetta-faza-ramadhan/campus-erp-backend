// *************** IMPORT LIBRARY ***************
const { GraphQLScalarType, Kind } = require("graphql");

/**
 * ISO 8601 date-time scalar.
 * Serializes Date -> "2025-09-01T00:00:00.000Z".
 * Parses "2025-09-01T00:00:00.000Z" -> Date.
 */
const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO 8601 date-time string",
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    throw new TypeError("DateTime cannot serialize non-Date value");
  },
  parseValue(value) {
    if (typeof value === "string") return new Date(value);
    throw new TypeError("DateTime cannot parse non-string value");
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    throw new TypeError("DateTime cannot parse non-string literal");
  },
});

// *************** EXPORT MODULE ***************
module.exports = { DateTime };