// *************** IMPORT MODULE ***************
const typeDefs = require('./auth.typedef');
const resolvers = require('./auth.resolver');

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers,
};
