// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  type GradingRule {
    label: String!
    operator: String!
    threshold: Float!
  }

  type Block {
    _id: ID!
    name: String!
    academic_year: String!
    grading_rules: [GradingRule!]!
  }

  type Subject {
    _id: ID!
    name: String!
    block_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
  }

  type Test {
    _id: ID!
    name: String!
    subject_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
  }

  input CreateBlockInput {
    name: String!
    academic_year: String!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateBlockInput {
    _id: ID!
    name: String
    academic_year: String
    grading_rules: [GradingRuleInput!]
  }

  input CreateSubjectInput {
    name: String!
    block_id: ID!
    weightage: Float!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateSubjectInput {
    _id: ID!
    name: String
    block_id: ID
    weightage: Float
    grading_rules: [GradingRuleInput!]
  }

  input CreateTestInput {
    name: String!
    subject_id: ID!
    weightage: Float!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateTestInput {
    _id: ID!
    name: String
    subject_id: ID
    weightage: Float
    grading_rules: [GradingRuleInput!]
  }

  input GradingRuleInput {
    label: String!
    operator: String!
    threshold: Float!
  }

  type Query {
    getBlocks: [Block!]!
    getSubjects(block_id: ID!): [Subject!]!
    getTests(subject_id: ID!): [Test!]!
  }

  type Mutation {
    createBlock(input: CreateBlockInput!): Block!
    updateBlock(input: UpdateBlockInput!): Block!
    deleteBlock(_id: ID!): Block!
    createSubject(input: CreateSubjectInput!): Subject!
    updateSubject(input: UpdateSubjectInput!): Subject!
    deleteSubject(_id: ID!): Subject!
    createTest(input: CreateTestInput!): Test!
    updateTest(input: UpdateTestInput!): Test!
    deleteTest(_id: ID!): Test!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
