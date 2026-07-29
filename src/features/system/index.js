// *************** IMPORT MODULE ***************
const typeDefs = require("./system.typedef");
const resolvers = require("./system.query.resolver");

// *************** EXPORT MODULE ***************
module.exports = { typeDefs, resolvers };
