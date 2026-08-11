/**
 * System health check resolver.
 *
 * @returns {string} Returns 'pong' for a successful health check.
 */
const Ping = () => 'pong';

// *************** EXPORT MODULE ***************
module.exports = { Query: { ping: Ping } };
