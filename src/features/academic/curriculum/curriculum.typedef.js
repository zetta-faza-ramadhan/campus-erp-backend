// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  scalar DateTime

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
    created_at: DateTime!
    updated_at: DateTime!
    deleted_at: DateTime
  }

  type Subject {
    _id: ID!
    name: String!
    block_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
    created_at: DateTime!
    updated_at: DateTime!
    deleted_at: DateTime
  }

  type Test {
    _id: ID!
    name: String!
    subject_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
    created_at: DateTime!
    updated_at: DateTime!
    deleted_at: DateTime
  }

  input CreateBlockInput {
    name: String!
    academicYear: String!
    gradingRules: [GradingRuleInput!]!
  }

  input UpdateBlockInput {
    _id: ID!
    name: String
    academicYear: String
    gradingRules: [GradingRuleInput!]
  }

  input CreateSubjectInput {
    name: String!
    blockId: ID!
    weightage: Float!
    gradingRules: [GradingRuleInput!]!
  }

  input UpdateSubjectInput {
    _id: ID!
    name: String
    blockId: ID
    weightage: Float
    gradingRules: [GradingRuleInput!]
  }

  input CreateTestInput {
    name: String!
    subjectId: ID!
    weightage: Float!
    gradingRules: [GradingRuleInput!]!
  }

  input UpdateTestInput {
    _id: ID!
    name: String
    subjectId: ID
    weightage: Float
    gradingRules: [GradingRuleInput!]
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
