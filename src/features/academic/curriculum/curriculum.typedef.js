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
    CreateBlock(input: CreateBlockInput!): Block! @auth(requires: ADMIN)
    UpdateBlock(input: UpdateBlockInput!): Block! @auth(requires: ADMIN)
    DeleteBlock(block_id: ID!): Block! @auth(requires: ADMIN)
    CreateSubject(input: CreateSubjectInput!): Subject! @auth(requires: ADMIN)
    UpdateSubject(input: UpdateSubjectInput!): Subject! @auth(requires: ADMIN)
    DeleteSubject(subject_id: ID!): Subject! @auth(requires: ADMIN)
    CreateTest(input: CreateTestInput!): Test! @auth(requires: ADMIN)
    UpdateTest(input: UpdateTestInput!): Test! @auth(requires: ADMIN)
    DeleteTest(test_id: ID!): Test! @auth(requires: ADMIN)
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
