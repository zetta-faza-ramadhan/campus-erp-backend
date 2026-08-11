// *************** IMPORT LIBRARY ***************
const Joi = require('joi');

// *************** GLOBAL VARIABLES ***************
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

// *************** REUSABLE OBJECTID VALIDATION ***************
const ObjectIdSchema = Joi.string().regex(OBJECT_ID_PATTERN).required();

// *************** EXPORT MODULE ***************
module.exports = { OBJECT_ID_PATTERN, ObjectIdSchema };
