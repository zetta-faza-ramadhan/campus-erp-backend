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
    GetBlocks: [Block!]!
    GetSubjects(block_id: ID!): [Subject!]!
    GetTests(subject_id: ID!): [Test!]!
  }

  type Mutation {
    CreateBlock(input: CreateBlockInput!): Block!
    UpdateBlock(input: UpdateBlockInput!): Block!
    DeleteBlock(block_id: ID!): Block!
    CreateSubject(input: CreateSubjectInput!): Subject!
    UpdateSubject(input: UpdateSubjectInput!): Subject!
    DeleteSubject(subject_id: ID!): Subject!
    CreateTest(input: CreateTestInput!): Test!
    UpdateTest(input: UpdateTestInput!): Test!
    DeleteTest(test_id: ID!): Test!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
